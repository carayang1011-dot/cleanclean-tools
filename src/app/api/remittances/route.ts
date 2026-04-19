import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'
import { syncRemittancesToSheets } from '@/lib/sync-sheets'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const month  = searchParams.get('month') ?? ''
  const paid   = searchParams.get('paid') ?? ''
  const q      = searchParams.get('q') ?? ''

  const supabase = await createClient()
  let query = supabase
    .from('remittances')
    .select('*', { count: 'exact' })
    .order('month', { ascending: false })
    .order('id', { ascending: true })

  if (month) query = query.eq('month', month)
  if (paid === 'true')  query = query.eq('is_paid', true)
  if (paid === 'false') query = query.eq('is_paid', false)
  if (q) query = query.or(
    `content.ilike.%${q}%,account_name.ilike.%${q}%,collab_name.ilike.%${q}%,invoice.ilike.%${q}%,notes.ilike.%${q}%`
  )

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  if (!body.content?.trim()) return NextResponse.json({ error: '內容必填' }, { status: 400 })
  if (!body.month?.trim())   return NextResponse.json({ error: '月份必填' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('remittances')
    .insert([{
      month:        body.month.trim(),
      due_date:     body.due_date?.trim() || null,
      paid_date:    body.paid_date || null,
      confirmed:    body.confirmed ?? false,
      invoice:      body.invoice?.trim() || null,
      amount:       body.amount != null ? Number(body.amount) : null,
      bank_info:    body.bank_info?.trim() || null,
      content:      body.content.trim(),
      notes:        body.notes?.trim() || null,
      account_name: body.account_name?.trim() || null,
      collab_name:  body.collab_name?.trim() || null,
      is_paid:      body.is_paid ?? false,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  syncRemittancesToSheets().catch(() => {})
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id, ...body } = await request.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const supabase = await createClient()
  const update: Record<string, unknown> = {}
  if (body.month        !== undefined) update.month        = body.month
  if (body.due_date     !== undefined) update.due_date     = body.due_date?.trim() || null
  if (body.paid_date    !== undefined) update.paid_date    = body.paid_date || null
  if (body.confirmed    !== undefined) update.confirmed    = body.confirmed
  if (body.invoice      !== undefined) update.invoice      = body.invoice?.trim() || null
  if (body.amount       !== undefined) update.amount       = body.amount != null ? Number(body.amount) : null
  if (body.bank_info    !== undefined) update.bank_info    = body.bank_info?.trim() || null
  if (body.content      !== undefined) update.content      = body.content.trim()
  if (body.notes        !== undefined) update.notes        = body.notes?.trim() || null
  if (body.account_name !== undefined) update.account_name = body.account_name?.trim() || null
  if (body.collab_name  !== undefined) update.collab_name  = body.collab_name?.trim() || null
  if (body.is_paid      !== undefined) update.is_paid      = body.is_paid

  const { data, error } = await supabase
    .from('remittances')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  syncRemittancesToSheets().catch(() => {})
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('remittances').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  syncRemittancesToSheets().catch(() => {})
  return NextResponse.json({ ok: true })
}
