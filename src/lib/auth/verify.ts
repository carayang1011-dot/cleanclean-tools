import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Profile } from '@/lib/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Verifies the request is authenticated by checking the profile_id cookie.
 * Returns the profile if valid, otherwise returns a 401 NextResponse.
 *
 * Usage in API routes:
 *   const result = await verifyAuth(request)
 *   if (result instanceof NextResponse) return result
 *   const { profile } = result
 */
export async function verifyAuth(
  request: NextRequest,
  requiredRole?: Profile['role']
): Promise<{ profile: Profile } | NextResponse> {
  const profileId = request.cookies.get('profile_id')?.value

  if (!profileId || !UUID_REGEX.test(profileId)) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: '身份驗證失敗' }, { status: 401 })
  }

  if (requiredRole && profile.role !== requiredRole) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  return { profile: profile as Profile }
}
