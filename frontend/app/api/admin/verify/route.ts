import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')

  if (adminSession?.value === 'exameve-admin-active') {
    return NextResponse.json({ authenticated: true })
  }

  return NextResponse.json({ authenticated: false }, { status: 401 })
}

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', '', {
    path: '/',
    maxAge: 0
  })
  return response
}
