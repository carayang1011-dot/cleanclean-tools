import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })

  // Clear cookie securely
  response.cookies.set('profile_id', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })

  return response
}
