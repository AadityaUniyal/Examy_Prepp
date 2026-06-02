'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Smartphone, KeyRound, AlertCircle, Copy, Check, Fingerprint, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@exameve.com')
  const [secretKey, setSecretKey] = useState('')
  const [totpInput, setTotpInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // 2FA Authenticator Simulator States
  const [authCode, setAuthCode] = useState('000000')
  const [timeLeft, setTimeLeft] = useState(30)
  const [copiedText, setCopiedText] = useState('')

  // Synchronization algorithm for mock Authenticator
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const epoch = Math.floor(now / 30000)
      const computed = Math.floor((Math.abs(Math.sin(epoch) * 1000000) % 1000000)).toString().padStart(6, '0')
      
      setAuthCode(computed)
      
      const secondsPassed = Math.floor((now % 30000) / 1000)
      setTimeLeft(30 - secondsPassed)
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(''), 2000)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (!secretKey) {
      setErrorMsg('Secret master key is required.')
      return
    }
    if (totpInput.length !== 6) {
      setErrorMsg('Multi-factor authorization token must be 6 digits.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, secretKey, totpCode: totpInput })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/admin')
      } else {
        setErrorMsg(data.error || 'Authentication rejected. Verify 2FA code sync.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Connection failed. Server API unreachable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Visual background glows */}
      <div className="absolute top-[-10%] left-[-10%] right-[-10%] bottom-[-10%] pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[15%] w-[300px] h-[300px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Column: Dedicated Admin Credentials Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex h-11 w-11 rounded-2xl bg-gradient-to-tr from-red-500 to-indigo-500 items-center justify-center shadow-lg shadow-red-500/15">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
              Root Control Portal
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify administrative credentials. This secure portal requires multi-factor authenticator app validation.
            </p>
          </div>

          <Card className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>

            {errorMsg && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                {/* Admin Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">
                    Administrative Account ID
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    required
                  />
                </div>

                {/* Secret Master Key */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider flex justify-between">
                    <span>Secret Master Passphrase</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('exameve-root-secret', 'key')}
                      className="text-[9px] lowercase font-semibold text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                    >
                      {copiedText === 'key' ? (
                        <>Copied <Check className="w-2.5 h-2.5" /></>
                      ) : (
                        <>Demo Key <Copy className="w-2.5 h-2.5" /></>
                      )}
                    </button>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter root master passphrase..."
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    required
                  />
                </div>

                {/* TOTP 2FA Verification Token */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider flex justify-between">
                    <span>2FA Security Token (App Verification)</span>
                    <span className="text-[9px] text-slate-500 font-medium">Syncing...</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="------"
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2.5 text-center text-lg font-black tracking-widest text-white placeholder-slate-700 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    required
                  />
                </div>
              </div>

              {/* Submit Trigger */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  {loading ? 'Verifying 2FA Signatures...' : 'Authorize Administrator Session'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Quick Demo Info Box */}
          <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-2xl flex flex-col gap-1 text-[10px] text-slate-500 leading-relaxed">
            <p className="font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3 text-red-500" /> Admin Credentials:
            </p>
            <p>• Account ID: <span className="text-slate-300 font-bold select-all">admin@exameve.com</span></p>
            <p>• Master Key: <span className="text-slate-300 font-bold select-all">exameve-root-secret</span></p>
            <p>• Verification: Enter the 6-digit code shown on the simulated authenticator screen.</p>
          </div>
        </div>

        {/* Right Column: Simulated Mobile Smartphone showing Authenticator app */}
        <div className="flex justify-center items-center">
          {/* Outer Mobile Case Mockup */}
          <div className="w-[300px] h-[550px] bg-slate-950 border-[6px] border-slate-850 rounded-[48px] shadow-2xl p-3.5 relative flex flex-col overflow-hidden">
            {/* Camera notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-20 rounded-full bg-slate-950 border border-slate-900 z-50"></div>
            
            {/* Phone Screen Container */}
            <div className="flex-1 bg-slate-900 border border-slate-850 rounded-[38px] overflow-hidden flex flex-col justify-between p-5 relative select-none">
              {/* Soft decorative spot bg */}
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>

              {/* Status bar */}
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 tracking-wide pt-1">
                <span>12:00 PM</span>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-2.5 h-2.5 text-slate-650" />
                  <span>5G</span>
                  <div className="w-4 h-2 bg-slate-550 rounded-sm"></div>
                </div>
              </div>

              {/* Authenticator App Body */}
              <div className="flex-1 flex flex-col justify-start pt-6 space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-200 tracking-tight flex items-center justify-center gap-1">
                    <Fingerprint className="w-4 h-4 text-red-400" /> KeyShield 2FA
                  </h3>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Authenticator Server</p>
                </div>

                {/* Account Details Panel */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 text-center space-y-3 relative">
                  <span className="block text-[8px] uppercase font-bold text-slate-500 tracking-wider">
                    ExamEve Root Console
                  </span>
                  <p className="text-[10px] font-semibold text-slate-400 truncate">admin@exameve.com</p>
                  
                  {/* Master Code Display */}
                  <div className="py-2">
                    <span className="text-3xl font-black font-mono tracking-widest text-indigo-400 block drop-shadow-[0_0_12px_rgba(99,102,241,0.2)] animate-pulse">
                      {authCode.slice(0,3)} {authCode.slice(3,6)}
                    </span>
                  </div>

                  {/* Countdown Timer bar */}
                  <div className="space-y-1">
                    <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase tracking-wider">
                      <span>Refreshes in</span>
                      <span>{timeLeft}s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy prompt button inside mobile */}
              <div className="pb-2">
                <button
                  onClick={() => handleCopy(authCode, 'totp')}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-950/80 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  {copiedText === 'totp' ? (
                    <>Token Copied! <Check className="w-3.5 h-3.5 text-emerald-400" /></>
                  ) : (
                    <>Copy OTP Token <Copy className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-20 rounded-full bg-slate-800"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
