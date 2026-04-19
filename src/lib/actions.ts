'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { STATUS_TRANSITIONS, HARDCODED_DESIGNERS } from '@/lib/constants'
import { sanitizeText, sanitizeFileName } from '@/lib/sanitize'
import { notify } from '@/lib/notify'
import { syncDesignRequestsToSheets } from '@/lib/sync-sheets'

// ── Helper: get & validate current profile ──
async function getCurrentProfile() {
  const cookieStore = await cookies()
  const profileId = cookieStore.get('profile_id')?.value
  if (!profileId) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  return profile
}

// ── Update request status ──
export async function updateRequestStatus(requestId: number, newStatus: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  // Validate status value
  const validStatuses = ['pending', 'in_progress', 'review', 'revision', 'completed']
  if (!validStatuses.includes(newStatus)) return { error: '無效的狀態' }

  const supabase = await createClient()

  // Fetch the request to validate transition & permissions
  const { data: request } = await supabase
    .from('design_requests')
    .select('id, status, requester_id')
    .eq('id', requestId)
    .single()

  if (!request) return { error: '需求不存在' }

  // Validate status transition
  const allowed = STATUS_TRANSITIONS[request.status] ?? []
  if (!allowed.includes(newStatus)) return { error: '不允許的狀態轉換' }

  // Validate permissions
  const isDesignerOrAdmin = profile.role === 'designer' || profile.role === 'admin'
  const isRequester = profile.id === request.requester_id

  // Only designer/admin can move to in_progress, review
  if (['in_progress', 'review'].includes(newStatus) && !isDesignerOrAdmin) {
    return { error: '權限不足' }
  }
  // Only requester can approve (completed) or request revision
  if (['completed', 'revision'].includes(newStatus) && !isRequester) {
    return { error: '權限不足' }
  }

  const { error } = await supabase
    .from('design_requests')
    .update({ status: newStatus })
    .eq('id', requestId)

  if (error) return { error: '狀態更新失敗：' + error.message }

  syncDesignRequestsToSheets().catch(() => {})

  // 發通知
  const { data: fullRequest } = await supabase
    .from('design_requests')
    .select('id, activity_name, requester:profiles!requester_id(name), designer:profiles!designer_id(name)')
    .eq('id', requestId)
    .single()

  if (fullRequest) {
    const activityName = fullRequest.activity_name
    const requesterName = (fullRequest.requester as unknown as { name: string } | null)?.name ?? '需求方'
    const designerName = (fullRequest.designer as unknown as { name: string } | null)?.name ?? '設計師'

    if (newStatus === 'review') {
      // 設計完成 → 通知填寫者
      notify({ event: 'request_completed', activityName, designerName, requestId }).catch(() => {})
    } else if (newStatus === 'completed') {
      // 結案 → 通知設計師
      notify({ event: 'request_closed', activityName, requesterName, requestId }).catch(() => {})
    }
  }

  return { ok: true }
}

// ── Assign designer ──
export async function assignDesigner(requestId: number, designerId: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  if (profile.role === 'requester') return { error: '權限不足' }

  const supabase = await createClient()

  // Validate designer exists and has designer role
  const { data: designer } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', designerId)
    .single()

  if (!designer || designer.role !== 'designer') return { error: '無效的設計師' }

  const { error } = await supabase
    .from('design_requests')
    .update({ designer_id: designerId, status: 'in_progress' })
    .eq('id', requestId)

  if (error) return { error: '指派失敗：' + error.message }

  syncDesignRequestsToSheets().catch(() => {})
  return { ok: true }
}

// ── Assign designer by name (for hardcoded designers without auth accounts) ──
export async function assignDesignerByName(requestId: number, name: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }
  if (profile.role === 'requester') return { error: '權限不足' }
  if (!(HARDCODED_DESIGNERS as readonly string[]).includes(name)) return { error: '無效的設計師' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('design_requests')
    .update({ designer_name: name, status: 'in_progress' })
    .eq('id', requestId)

  if (error) return { error: '指派失敗：' + error.message }
  syncDesignRequestsToSheets().catch(() => {})
  return { ok: true }
}

// ── Post comment ──
export async function postComment(requestId: number, content: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  const sanitized = sanitizeText(content)
  if (!sanitized.trim()) return { error: '留言不能為空' }
  if (sanitized.length > 5000) return { error: '留言不能超過 5000 字' }

  const supabase = await createClient()

  // Verify user has access to this request
  const { data: request } = await supabase
    .from('design_requests')
    .select('id, requester_id')
    .eq('id', requestId)
    .single()

  if (!request) return { error: '需求不存在' }

  const canAccess = request.requester_id === profile.id || profile.role !== 'requester'
  if (!canAccess) return { error: '權限不足' }

  const { data, error } = await supabase
    .from('comments')
    .insert({ request_id: requestId, author_id: profile.id, content: sanitized })
    .select('*, author:profiles(*)')
    .single()

  if (error) return { error: '留言失敗：' + error.message }
  return { ok: true, data }
}

// ── Update user role (admin only) ──
export async function updateUserRole(userId: string, role: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  if (profile.role !== 'admin') return { error: '權限不足：僅管理員可操作' }

  const validRoles = ['requester', 'designer', 'admin']
  if (!validRoles.includes(role)) return { error: '無效的角色' }

  // Prevent removing own admin role
  if (userId === profile.id) return { error: '不能修改自己的角色' }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)

  if (error) return { error: '更新失敗：' + error.message }
  return { ok: true }
}

// ── Excel import (admin only) ──
export async function importExcelData(
  rows: Array<{
    channel_id: number | null
    activity_period: string | null
    activity_name: string
    purpose: string
    size_spec: string | null
    quantity: number
    copywriting: string | null
    product_info: string | null
    deadline: string | null
    notes: string | null
    status: string
  }>
) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  if (profile.role !== 'admin') return { error: '權限不足：僅管理員可操作' }

  const supabase = await createClient()

  const validStatuses = ['pending', 'in_progress', 'review', 'revision', 'completed']
  let totalInserted = 0
  const logs: string[] = []

  // Sanitize and validate all rows
  const sanitizedRows = rows.map(row => ({
    ...row,
    activity_name: sanitizeText(row.activity_name),
    purpose: sanitizeText(row.purpose),
    copywriting: row.copywriting ? sanitizeText(row.copywriting) : null,
    product_info: row.product_info ? sanitizeText(row.product_info) : null,
    notes: row.notes ? sanitizeText(row.notes) : null,
    status: validStatuses.includes(row.status) ? row.status : 'completed',
    requester_id: profile.id,
    priority: 'normal',
  }))

  // Batch insert (50 at a time)
  for (let i = 0; i < sanitizedRows.length; i += 50) {
    const batch = sanitizedRows.slice(i, i + 50)
    const { error } = await supabase.from('design_requests').insert(batch)
    if (error) {
      logs.push(`❌ 第 ${i + 1}-${i + batch.length} 筆失敗：${error.message}`)
    } else {
      totalInserted += batch.length
      logs.push(`✅ 第 ${i + 1}-${i + batch.length} 筆匯入成功`)
    }
  }

  return { ok: true, totalInserted, logs }
}

// ── Create new request ──
export async function createRequest(data: {
  channel_id: number
  activity_period?: string
  activity_name: string
  purpose: string
  size_spec?: string
  quantity: number
  copywriting?: string
  product_info?: string
  reference_urls?: string[]
  deadline?: string
  priority: string
  notes?: string
}) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  // Validate priority
  const validPriorities = ['urgent', 'high', 'normal', 'low']
  if (!validPriorities.includes(data.priority)) return { error: '無效的優先級' }

  // Sanitize text fields
  const sanitized = {
    channel_id: data.channel_id,
    activity_period: data.activity_period?.trim() || null,
    activity_name: sanitizeText(data.activity_name),
    purpose: sanitizeText(data.purpose),
    size_spec: data.size_spec?.trim() || null,
    quantity: Math.max(1, Math.floor(data.quantity)),
    copywriting: data.copywriting ? sanitizeText(data.copywriting) : null,
    product_info: data.product_info ? sanitizeText(data.product_info) : null,
    reference_urls: data.reference_urls?.filter(u => {
      try { new URL(u); return true } catch { return false }
    }) || null,
    deadline: data.deadline || null,
    priority: data.priority,
    notes: data.notes ? sanitizeText(data.notes) : null,
    requester_id: profile.id,
  }

  if (!sanitized.activity_name || sanitized.activity_name.length < 2) {
    return { error: '活動名稱至少需要 2 個字' }
  }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('design_requests')
    .insert(sanitized)
    .select('id')
    .single()

  if (error) return { error: '提交失敗：' + error.message }

  syncDesignRequestsToSheets().catch(() => {})

  // 新需求通知設計組
  if (inserted) {
    notify({
      event: 'request_created',
      activityName: sanitized.activity_name,
      requesterName: profile.name,
      deadline: sanitized.deadline,
      priority: sanitized.priority,
      requestId: inserted.id,
    }).catch(() => {})
  }

  return { ok: true }
}

// ── Update request content (requester or admin) ──
export async function updateRequest(requestId: number, data: {
  activity_period?: string
  activity_name?: string
  purpose?: string
  size_spec?: string
  quantity?: number
  copywriting?: string
  product_info?: string
  deadline?: string
  priority?: string
  notes?: string
}) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  const supabase = await createClient()
  const { data: request } = await supabase
    .from('design_requests')
    .select('id, requester_id, status')
    .eq('id', requestId)
    .single()

  if (!request) return { error: '需求不存在' }

  const isOwner = request.requester_id === profile.id
  const isAdmin = profile.role === 'admin'
  if (!isOwner && !isAdmin) return { error: '權限不足' }

  const validPriorities = ['urgent', 'high', 'normal', 'low']
  const sanitized: Record<string, unknown> = {}
  if (data.activity_period !== undefined) sanitized.activity_period = data.activity_period?.trim() || null
  if (data.activity_name)  sanitized.activity_name  = sanitizeText(data.activity_name)
  if (data.purpose)        sanitized.purpose        = sanitizeText(data.purpose)
  if (data.size_spec !== undefined) sanitized.size_spec = data.size_spec?.trim() || null
  if (data.quantity)       sanitized.quantity       = Math.max(1, Math.floor(data.quantity))
  if (data.copywriting !== undefined) sanitized.copywriting  = data.copywriting ? sanitizeText(data.copywriting) : null
  if (data.product_info !== undefined) sanitized.product_info = data.product_info ? sanitizeText(data.product_info) : null
  if (data.deadline !== undefined) sanitized.deadline = data.deadline || null
  if (data.priority && validPriorities.includes(data.priority)) sanitized.priority = data.priority
  if (data.notes !== undefined) sanitized.notes = data.notes ? sanitizeText(data.notes) : null

  if (sanitized.activity_name && (sanitized.activity_name as string).length < 2) {
    return { error: '活動名稱至少需要 2 個字' }
  }

  const { error } = await supabase
    .from('design_requests')
    .update(sanitized)
    .eq('id', requestId)

  if (error) return { error: '更新失敗：' + error.message }

  syncDesignRequestsToSheets().catch(() => {})
  return { ok: true }
}

// ── Bulk status update (admin only) ──
export async function bulkUpdateStatus(requestIds: number[], newStatus: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }
  if (profile.role !== 'admin') return { error: '權限不足' }

  const validStatuses = ['pending', 'in_progress', 'review', 'revision', 'completed']
  if (!validStatuses.includes(newStatus)) return { error: '無效的狀態' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('design_requests')
    .update({ status: newStatus })
    .in('id', requestIds)

  if (error) return { error: '批次更新失敗：' + error.message }
  return { ok: true }
}

// ── Record file upload (after storage upload) ──
export async function recordFileUpload(data: {
  requestId: number
  fileName: string
  fileUrl: string
  fileType: 'deliverable' | 'reference' | 'revision'
}) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: '未登入' }

  const safeName = sanitizeFileName(data.fileName)

  const supabase = await createClient()

  // Verify access to the request
  const { data: request } = await supabase
    .from('design_requests')
    .select('id, requester_id')
    .eq('id', data.requestId)
    .single()

  if (!request) return { error: '需求不存在' }

  const canAccess = request.requester_id === profile.id || profile.role !== 'requester'
  if (!canAccess) return { error: '權限不足' }

  const { data: fileRecord, error } = await supabase
    .from('request_files')
    .insert({
      request_id: data.requestId,
      file_name: safeName,
      file_url: data.fileUrl,
      file_type: data.fileType,
      uploaded_by: profile.id,
    })
    .select('*, uploader:profiles(*)')
    .single()

  if (error) return { error: '記錄失敗：' + error.message }
  return { ok: true, data: fileRecord }
}
