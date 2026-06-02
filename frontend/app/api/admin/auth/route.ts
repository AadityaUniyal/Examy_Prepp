import { NextResponse } from 'next/server'

const verifyTOTP = (submittedCode: string): boolean => {
  const epoch = Math.floor(Date.now() / 30000)
  for (let offset = -1; offset <= 1; offset++) {
    const targetEpoch = epoch + offset
    const computed = Math.floor((Math.abs(Math.sin(targetEpoch) * 1000000) % 1000000)).toString().padStart(6, '0')
    if (computed === submittedCode) return true
  }
  return false
}

export async function POST(request: Request) {
  try {
    const { email, secretKey, totpCode } = await request.json()

    if (email !== 'admin@exameve.com') {
      return NextResponse.json({ success: false, error: 'Unauthorized credentials.' }, { status: 401 })
    }

    if (secretKey !== 'exameve-root-secret') {
      return NextResponse.json({ success: false, error: 'Invalid master secret key.' }, { status: 401 })
    }

    if (!totpCode || !verifyTOTP(totpCode)) {
      return NextResponse.json({ success: false, error: 'Invalid 2FA verification token.' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', 'exameve-admin-active', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hours session
    })

    return response
  } catch (err) {
    console.error('[Admin Auth API] Error:', err)
    return NextResponse.json({ success: false, error: 'Server authentication failure.' }, { status: 500 })
  }
}
