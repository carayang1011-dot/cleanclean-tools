'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatDate, formatDateTime, formatRelativeTime, STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL } from '@/lib/utils'
import { STATUS_TRANSITIONS } from '@/lib/constants'
import { updateRequestStatus, assignDesigner as assignDesignerAction, assignDesignerByName, postComment as postCommentAction, recordFileUpload } from '@/lib/actions'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, sanitizeFileName, isSafeUrl } from '@/lib/sanitize'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Calendar, User, Tag, FileText, Link as LinkIcon,
  Send, Upload, Download, Clock, ArrowRight, ChevronLeft, Loader2
} from 'lucide-react'
import type { DesignRequest, Comment, RequestFile, StatusHistory, Profile } from '@/lib/types'

interface Props {
  request: DesignRequest
  comments: Comment[]
  files: RequestFile[]
  history: StatusHistory[]
  designers: Pick<Profile, 'id' | 'name'>[]
  currentProfile: Profile
}

export function RequestDetail({ request: initial, comments: initialComments, files: initialFiles, history, designers, currentProfile }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [request, setRequest] = useState(initial)
  const [comments, setComments] = useState(initialComments)
  const [files, setFiles] = useState(initialFiles)
  const [comment, setComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [uploading, setUploading] = useState(false)

  const isDesignerOrAdmin = currentProfile.role !== 'requester'
  const isRequester = currentProfile.id === request.requester_id
  const nextStatuses = STATUS_TRANSITIONS[request.status] ?? []

  // 更新狀態（透過 Server Action，內含權限驗證）
  const updateStatus = async (newStatus: string) => {
    const result = await updateRequestStatus(request.id, newStatus)
    if (result.error) { toast.error(result.error); return }
    setRequest(r => ({ ...r, status: newStatus as typeof r.status }))
    toast.success(`狀態已更新為「${STATUS_LABEL[newStatus as keyof typeof STATUS_LABEL]}」`)
    router.refresh()
  }

  // 指派設計師（透過 Server Action，內含權限驗證）
  const assignDesigner = async (value: string) => {
    const result = value.startsWith('name:')
      ? await assignDesignerByName(request.id, value.slice(5))
      : await assignDesignerAction(request.id, value)
    if (result.error) { toast.error(result.error); return }
    toast.success('已指派設計師並開始進行')
    router.refresh()
  }

  // 留言（透過 Server Action，內含權限驗證 + 內容過濾）
  const postComment = async () => {
    if (!comment.trim()) return
    setPostingComment(true)
    const result = await postCommentAction(request.id, comment)
    if (result.error) { toast.error(result.error); setPostingComment(false); return }
    if (result.data) setComments(prev => [...prev, result.data])
    setComment('')
    setPostingComment(false)
  }

  // 上傳檔案（含 MIME 驗證 + 檔名消毒）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size before upload
    if (file.size > MAX_FILE_SIZE) { toast.error('檔案不能超過 50MB'); return }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      toast.error('不支援的檔案格式，請上傳圖片、PDF 或 ZIP')
      return
    }

    setUploading(true)
    // Use sanitized filename with random prefix to prevent path traversal
    const safeName = sanitizeFileName(file.name)
    const path = `${currentProfile.id}/${request.id}/${Date.now()}_${safeName}`
    const { error: upErr } = await supabase.storage.from('design-files').upload(path, file)
    if (upErr) { toast.error('上傳失敗：' + upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('design-files').getPublicUrl(path)

    const result = await recordFileUpload({
      requestId: request.id,
      fileName: safeName,
      fileUrl: publicUrl,
      fileType: isDesignerOrAdmin ? 'deliverable' : 'reference',
    })

    if (result.error) { toast.error(result.error); setUploading(false); return }
    if (result.data) setFiles(prev => [...prev, result.data])
    toast.success(`${safeName} 上傳完成`)
    setUploading(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 返回 */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ChevronLeft className="h-4 w-4" />返回
      </Button>

      {/* 標題列 */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_COLOR[request.status])}>
            {STATUS_LABEL[request.status]}
          </span>
          <Badge variant="outline" className="text-xs">{PRIORITY_LABEL[request.priority]}</Badge>
          <span className="text-xs text-muted-foreground">#{request.id}</span>
        </div>
        <h2 className="text-xl font-bold">{request.activity_name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{request.channel?.name} · {request.purpose}</p>
      </div>

      {/* 角色行動區 */}
      {isDesignerOrAdmin && request.status === 'pending' && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-blue-900">新需求待接受</p>
            <p className="text-sm text-blue-700 mt-0.5">由 {request.requester?.name} 發出 · {request.channel?.name}</p>
          </div>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0"
            onClick={() => updateStatus('in_progress')}>
            ✋ 接受任務
          </Button>
        </div>
      )}

      {isDesignerOrAdmin && request.status === 'in_progress' && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-amber-900">製作中</p>
            <p className="text-sm text-amber-700 mt-0.5">完成後請上傳成品，再送審核通知需求方</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={() => updateStatus('pending')}>
              ↩ 退回待處理
            </Button>
            <label className={cn('cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-amber-300 text-amber-800 font-medium text-sm hover:bg-amber-50 transition-colors', uploading && 'opacity-50 pointer-events-none')}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? '上傳中…' : '上傳成品'}
              <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.zip" />
            </label>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              onClick={() => updateStatus('review')}>
              <Send className="h-4 w-4" />通知需求方審核
            </Button>
          </div>
        </div>
      )}

      {request.status === 'review' && (isRequester || isDesignerOrAdmin) && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-emerald-900">設計已完成，請確認</p>
            <p className="text-sm text-emerald-700 mt-0.5">請查看下方檔案，確認是否通過</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {isDesignerOrAdmin && (
              <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50"
                onClick={() => updateStatus('in_progress')}>
                ↩ 退回製作中
              </Button>
            )}
            {isRequester && (
              <>
                <Button size="sm" variant="outline" className="border-orange-400 text-orange-600 hover:bg-orange-50"
                  onClick={() => updateStatus('revision')}>
                  🔄 需要修改
                </Button>
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  onClick={() => updateStatus('completed')}>
                  ✅ 確認通過
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {isDesignerOrAdmin && request.status === 'revision' && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-orange-900">需求方要求修改</p>
            <p className="text-sm text-orange-700 mt-0.5">請查看下方討論中的修改意見後重新製作</p>
          </div>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-2 shrink-0"
            onClick={() => updateStatus('in_progress')}>
            重新製作
          </Button>
        </div>
      )}

      {request.status === 'completed' && (
        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 flex items-center gap-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-gray-700">需求已完成</p>
            <p className="text-sm text-muted-foreground">已於 {formatDate(request.updated_at)} 完成</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* 左欄：需求詳情 */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground">需求詳情</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { icon: Tag, label: '活動期間', value: request.activity_period },
                { icon: FileText, label: '用途', value: request.purpose },
                { icon: FileText, label: '尺寸規格', value: request.size_spec },
                { icon: FileText, label: '數量', value: request.quantity > 1 ? `${request.quantity} 件` : null },
                { icon: Calendar, label: '截止日', value: formatDate(request.deadline) },
              ].map(({ icon: Icon, label, value }) => value ? (
                <div key={label} className="flex gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div><span className="text-muted-foreground mr-2">{label}</span><span className="font-medium">{value}</span></div>
                </div>
              ) : null)}

              {request.copywriting && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">文案內容</p>
                  <p className="bg-gray-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{request.copywriting}</p>
                </div>
              )}
              {request.product_info && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">需求說明（產品）</p>
                  <p className="bg-gray-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{request.product_info}</p>
                </div>
              )}
              {request.reference_urls?.filter(Boolean).filter(isSafeUrl).map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="text-brand-700 hover:underline text-sm truncate">{url}</a>
                </div>
              ))}
              {request.notes && (
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">備註</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 檔案區 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  成品檔案 {files.length > 0 && <span className="ml-1 text-brand-700">({files.length})</span>}
                </CardTitle>
                {isDesignerOrAdmin && (
                  <label className={cn('cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors', uploading && 'opacity-50 pointer-events-none')}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {uploading ? '上傳中…' : '上傳檔案'}
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.zip" />
                  </label>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">尚無檔案</p>
              ) : (
                <div className="space-y-2">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground">{f.uploader?.name} · {formatDateTime(f.uploaded_at)}</p>
                      </div>
                      <a href={f.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 討論區 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">討論（{comments.length}）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">還沒有留言</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-brand-100 text-brand-800 text-xs">
                      {c.author?.name?.slice(0,2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{c.author?.name}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}

              <Separator />
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-brand-100 text-brand-800 text-xs">
                    {currentProfile.name.slice(0,2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="留下意見或追問…"
                    className="min-h-[80px] resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={postComment} disabled={!comment.trim() || postingComment}
                      className="bg-brand-800 hover:bg-brand-900 text-white">
                      {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      送出
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右欄：側邊資訊 */}
        <div className="space-y-4">
          {/* 人員資訊 */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">需求方</span>
                <span className="font-medium ml-auto">{request.requester?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">設計師</span>
                {(request.designer?.name ?? request.designer_name) ? (
                  <span className="font-medium ml-auto">{request.designer?.name ?? request.designer_name}</span>
                ) : (
                  <select
                    className="ml-auto text-xs border rounded px-2 py-1"
                    onChange={e => e.target.value && assignDesigner(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>指派…</option>
                    {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">建立</span>
                <span className="ml-auto text-xs">{formatDate(request.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">更新</span>
                <span className="ml-auto text-xs">{formatDate(request.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 狀態時間軸 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground">狀態紀錄</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                  <div>
                    <span className="font-medium text-brand-800">需求建立</span>
                    <p className="text-muted-foreground">{formatDateTime(request.created_at)}</p>
                  </div>
                </div>
                {history.map(h => (
                  <div key={h.id} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLOR[h.old_status ?? 'pending'])}>
                          {STATUS_LABEL[h.old_status ?? 'pending']}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLOR[h.new_status])}>
                          {STATUS_LABEL[h.new_status]}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {h.changer?.name} · {formatRelativeTime(h.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
