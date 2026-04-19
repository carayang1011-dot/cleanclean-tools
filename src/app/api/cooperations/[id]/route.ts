import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cooperations')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('cooperations').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
