import { NextResponse, type NextRequest } from 'next/server'

// Simple UUID v4 format validation to prevent cookie tampering
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const profileId = request.cookies.get('profile_id')?.value

  // Validate profile_id format if present (prevent injection via cookie)
  const validProfileId = profileId && UUID_REGEX.test(profileId) ? profileId : null

  // If cookie exists but is invalid format, clear it
  if (profileId && !validProfileId) {
    const response = NextResponse.redirect(new URL('/setup', request.url))
    response.cookies.set('profile_id', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    })
    return response
  }

  // 不需要驗證的路徑
  const publicPaths = ['/setup', '/login', '/api/auth']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  // 沒有選身份 → 去選身份頁
  if (!validProfileId && !isPublic) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 已選身份 → 不用再選
  if (validProfileId && (pathname.startsWith('/setup') || pathname.startsWith('/login'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
