'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useMutation, gql } from '@apollo/client'

const SYNC_USER_MUTATION = gql`
  mutation LoginWithGoogle($email: String!, $name: String!, $googleId: String) {
    loginWithGoogle(email: $email, name: $name, googleId: $googleId) {
      token
      user {
        id
        email
      }
    }
  }
`

export function AuthSync() {
  const { data: session, status } = useSession()
  const [loginWithGoogle] = useMutation(SYNC_USER_MUTATION)

  useEffect(() => {
    async function syncAuth() {
      if (status === 'authenticated' && session?.user?.email) {
        const savedToken = localStorage.getItem('exameve_token')
        const savedEmail = localStorage.getItem('exameve_user_email')
        
        if (!savedToken || savedEmail !== session.user.email) {
          try {
            const { data } = await loginWithGoogle({
              variables: {
                email: session.user.email,
                name: session.user.name || 'Student',
                googleId: (session as any).providerAccountId || session.user.email
              }
            })
            if (data?.loginWithGoogle?.token) {
              localStorage.setItem('exameve_token', data.loginWithGoogle.token)
              localStorage.setItem('exameve_user_email', session.user.email)
              console.log('[AuthSync] User token successfully synchronized with backend')
            }
          } catch (err) {
            console.error('[AuthSync] Synchronization error:', err)
          }
        }
      } else if (status === 'unauthenticated') {
        localStorage.removeItem('exameve_token')
        localStorage.removeItem('exameve_user_email')
      }
    }

    syncAuth()
  }, [session, status, loginWithGoogle])

  return null
}
