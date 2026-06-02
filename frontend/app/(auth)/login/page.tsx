'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, ShieldAlert } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Mesh & Glows */}
      <div className="absolute top-[-10%] left-[-10%] right-[-10%] bottom-[-10%] pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[15%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Logo Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
            <span className="font-extrabold text-white text-2xl tracking-tighter">E</span>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ExamEve
            </h1>
            <p className="text-sm text-slate-400 font-medium tracking-wide mt-1">
              AI-Powered Preparation Optimizer
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          {/* Top border neon line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white tracking-tight">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Login to access your adaptive study plans, flashcards, and real-time stress interventions.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              variant="default"
              className="w-full h-13 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold flex items-center justify-center gap-3 transition-transform active:scale-[0.99]"
            >
              <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="px-3 bg-slate-950/80 rounded-full text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push('/onboarding?demo=true')}
              className="w-full h-13 rounded-xl border-slate-850 bg-slate-900/20 hover:bg-slate-800/60 text-slate-300 font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
            >
              Explore Demo Mode <ArrowRight className="w-4 h-4 text-indigo-400" />
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[11px] leading-relaxed">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Master your exams in a 48 to 96-hour study sprint with calibrated active-recall modules.</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center leading-relaxed">
          By signing in, you agree to our Terms of Service and Privacy Policy.<br />
          ExamEve AI Optimizer • Secured Connection
        </p>
      </div>
    </div>
  )
}
