'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    const result = await signIn('google', {
      redirect: false,
      callbackUrl: '/dashboard'
    })

    if (result?.ok) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ExamEve</h1>
          <p className="text-gray-600">AI-Powered Exam Preparation</p>
          <p className="text-sm text-gray-500 mt-2">Study smarter in 48-96 hours</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            variant="default"
            className="w-full h-12 text-lg"
          >
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue as</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => router.push('/onboarding?demo=true')}
          >
            Demo Mode
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
