import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { ids, patch } = body

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'ids 必填' }, { status: 400 })
  if (!patch || typeof patch !== 'object')
    return NextResponse.json({ error: 'patch 必填' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('cooperations')
    .update(patch)
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: ids.length })
}
