import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const status    = searchParams.get('status') ?? ''
  const channelId = searchParams.get('channel_id') ?? ''
  const q         = searchParams.get('q') ?? ''
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit     = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '100')))

  const supabase = await createClient()

  let query = supabase
    .from('design_requests')
    .select(`
      id, channel_id, activity_period, activity_name, purpose,
      size_spec, quantity, deadline, status, priority,
      requester_id, designer_id,
      requester_name, designer_name, imported_from_sheet, source_row,
      created_at, updated_at,
      channel:channels(id, name, slug),
      requester:profiles!requester_id(id, name),
      designer:profiles!designer_id(id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status)    query = query.eq('status', status)
  if (channelId) query = query.eq('channel_id', parseInt(channelId))
  if (q)         query = query.or(
    `activity_name.ilike.%${q}%,purpose.ilike.%${q}%,requester_name.ilike.%${q}%,designer_name.ilike.%${q}%`
  )

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}
