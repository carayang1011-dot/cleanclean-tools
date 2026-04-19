import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const year   = searchParams.get('year') ?? ''
  const status = searchParams.get('status') ?? ''
  const owner  = searchParams.get('owner') ?? ''
  const type   = searchParams.get('type') ?? ''
  const q      = searchParams.get('q') ?? ''

  const supabase = await createClient()
  let query = supabase
    .from('cooperations')
    .select('*', { count: 'exact' })
    .order('start_date', { ascending: false })
    .order('id', { ascending: false })

  if (year)   query = query.eq('year', parseInt(year))
  if (status) query = query.eq('status', status)
  if (owner)  query = query.eq('owner', owner)
  if (type)   query = query.eq('cooperation_type', type)
  if (q)      query = query.or(
    `creator_name.ilike.%${q}%,product.ilike.%${q}%,owner.ilike.%${q}%,platform.ilike.%${q}%`
  )

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  if (!body.creator_name?.trim())
    return NextResponse.json({ error: '創作者姓名必填' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cooperations')
    .insert([body])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
