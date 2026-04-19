import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 profile selections per minute per IP
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
    const rl = rateLimit(`select-profile:${ip}`, { max: 10, windowMs: 60_000 })
    if (!rl.success) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
    }

    const { profileId } = await request.json()

    if (!profileId || typeof profileId !== 'string') {
      return NextResponse.json({ error: '缺少 profileId' }, { status: 400 })
    }

    // Validate that the profile exists in the database
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: '身份不存在' }, { status: 404 })
    }

    const response = NextResponse.json({ ok: true })

    // Set cookie with secure flags
    response.cookies.set('profile_id', profileId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    })

    return response
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
