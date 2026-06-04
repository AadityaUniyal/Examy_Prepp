'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Smartphone, 
  AlertCircle, 
  Copy, 
  Check, 
  Fingerprint, 
  Lock, 
  Camera, 
  RefreshCw,
  VideoOff
} from 'lucide-react'

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

  // Biometric Webcam States
  const [scanStatus, setScanStatus] = useState<'locked' | 'initializing' | 'scanning' | 'verified' | 'error'>('locked')
  const [scanMessage, setScanMessage] = useState('Biometrics Locked')
  const [scanPercent, setScanPercent] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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
    return () => {
      clearInterval(timer)
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const playChirp = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      osc.start()
      
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5
      gain.gain.setValueAtTime(0.06, ctx.currentTime + 0.1)
      
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.35)
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {
      console.warn('Web Audio API not supported or blocked')
    }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(''), 2000)
  }

  const startBiometricScan = async () => {
    setScanStatus('initializing')
    setScanMessage('Initializing camera module...')
    setScanPercent(0)
    setErrorMsg('')

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } })
      setStream(mediaStream)
      setScanStatus('scanning')

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      let currentProgress = 0
      const messages = [
        'Searching for facial profile...',
        'Aligning biometric landmark grid...',
        'Scanning iris signature...',
        'Checking master root signatures...',
        'Signature verified: Owner HP'
      ]

      const interval = setInterval(() => {
        currentProgress += 5
        setScanPercent(currentProgress)
        
        const msgIndex = Math.min(Math.floor(currentProgress / 20), messages.length - 1)
        setScanMessage(messages[msgIndex])

        if (currentProgress >= 100) {
          clearInterval(interval)
          setScanStatus('verified')
          playChirp()
          mediaStream.getTracks().forEach(track => track.stop())
          setStream(null)
        }
      }, 150)

    } catch (err: any) {
      console.error('Camera capture error:', err)
      setScanStatus('error')
      setScanMessage('Webcam access blocked or unavailable.')
    }
  }

  const handleBypassScan = () => {
    setScanStatus('initializing')
    setScanMessage('Simulating iris scan bypass...')
    setScanPercent(0)

    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += 10
      setScanPercent(currentProgress)
      if (currentProgress >= 100) {
        clearInterval(interval)
        setScanStatus('verified')
        playChirp()
      }
    }, 100)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (scanStatus !== 'verified') {
      setErrorMsg('Facial biometric scanning is required to verify identity.')
      return
    }
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
    <div className="min-h-screen bg-gradient-mesh text-[rgb(var(--text-primary))] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        <div className="space-y-6 animate-slide-up">
          <div className="space-y-2">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-brand items-center justify-center shadow-glow-brand">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gradient">
              Root Control Portal
            </h1>
            <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
              Verify root administrative credentials. Unlock the dynamic 2FA console by scanning your biometric owner profile.
            </p>
          </div>

          <div className="glass-card p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-brand-500 to-accent-400"></div>

            {errorMsg && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">
                    Administrative Account ID
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2.5 text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider flex justify-between">
                    <span>Secret Master Passphrase</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('exameve-root-secret', 'key')}
                      className="text-[9px] lowercase font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--brand-400))] transition-colors flex items-center gap-1"
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
                    className="w-full bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2.5 text-sm text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/40 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider flex justify-between">
                    <span>2FA Security Token (App Verification)</span>
                    <span className="text-[9px] text-[rgb(var(--text-muted))] font-medium">
                      {scanStatus === 'verified' ? 'Unlocked ✓' : 'LOCKED - Face Verification Required'}
                    </span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder={scanStatus === 'verified' ? '------' : 'SCAN BIOMETRICS FIRST'}
                    disabled={scanStatus !== 'verified'}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2.5 text-center text-lg font-black tracking-widest text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/30 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-40"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading || scanStatus !== 'verified'}
                  className="w-full h-12 bg-gradient-brand hover:shadow-glow-brand text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Fingerprint className="w-4 h-4" />
                  {loading ? 'Verifying Credentials...' : 'Authorize Administrator Session'}
                </Button>
              </div>
            </form>
          </div>

          <div className="p-4 bg-[rgb(var(--surface-50))]/40 border border-[rgb(var(--surface-200))]/50 rounded-2xl flex flex-col gap-1 text-[10px] text-[rgb(var(--text-secondary))] leading-relaxed">
            <p className="font-extrabold uppercase text-[rgb(var(--text-primary))] tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-red-500" /> Admin Credentials & Guidelines:
            </p>
            <p>• Step 1: Scan your face on the mobile dashboard simulator (Right Column).</p>
            <p>• Step 2: Input Master key (<span className="text-[rgb(var(--text-primary))] select-all font-bold">exameve-root-secret</span>).</p>
            <p>• Step 3: Input OTP token unlocked on the simulator to sign session.</p>
          </div>
        </div>

        <div className="flex justify-center items-center animate-slide-in-right">
          <div className="w-[310px] h-[560px] bg-[rgb(var(--surface-0))] border-[6px] border-[rgb(var(--surface-200))] rounded-[48px] shadow-2xl p-3.5 relative flex flex-col overflow-hidden">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-20 rounded-full bg-[rgb(var(--surface-0))] border border-[rgb(var(--surface-100))] z-50"></div>
            
            <div className="flex-1 bg-[rgb(var(--surface-50))]/60 border border-[rgb(var(--surface-100))]/60 rounded-[38px] overflow-hidden flex flex-col justify-between p-5 relative select-none">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-brand-500/5 blur-3xl pointer-events-none"></div>

              <div className="flex justify-between items-center text-[9px] font-bold text-[rgb(var(--text-muted))] tracking-wide pt-1">
                <span>12:00 PM</span>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-2.5 h-2.5 text-[rgb(var(--text-muted))]" />
                  <span>5G</span>
                  <div className="w-4 h-2 bg-[rgb(var(--text-muted))] rounded-sm"></div>
                </div>
              </div>

              {scanStatus === 'locked' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 pt-4">
                  <div className="w-24 h-24 rounded-full bg-red-500/5 border border-red-500/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 to-transparent animate-pulse"></div>
                    <Lock className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-[rgb(var(--text-primary))]">Biometric Verification</h3>
                    <p className="text-[10px] text-[rgb(var(--text-secondary))] max-w-[200px]">Webcam scan required to authorize OTP code generation.</p>
                  </div>
                  <Button
                    onClick={startBiometricScan}
                    className="w-full bg-gradient-brand hover:shadow-glow-brand text-white font-extrabold text-xs h-10 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Camera className="w-3.5 h-3.5" /> Initialize Camera Scan
                  </Button>
                  <button
                    onClick={handleBypassScan}
                    className="text-[9px] font-bold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--brand-400))] transition-colors uppercase tracking-wider"
                  >
                    Bypass With Mock Sensor
                  </button>
                </div>
              )}

              {(scanStatus === 'initializing' || scanStatus === 'scanning') && (
                <div className="flex-1 flex flex-col justify-between items-center pt-6 pb-2">
                  <div className="w-full text-center space-y-1">
                    <h3 className="font-extrabold text-xs text-[rgb(var(--text-primary))] tracking-tight">Scanner Calibration</h3>
                    <span className="text-[9px] text-[rgb(var(--accent-400))] font-bold block">{scanPercent}% Analysis Done</span>
                  </div>

                  <div className="w-44 h-44 rounded-full border border-[rgb(var(--brand-500))]/30 overflow-hidden relative bg-black/80 flex items-center justify-center">
                    {scanStatus === 'scanning' ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="object-cover w-full h-full scale-x-[-1]"
                      />
                    ) : (
                      <div className="text-[rgb(var(--text-muted))] animate-pulse flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[rgb(var(--brand-500))]" />
                      </div>
                    )}
                    <div className="absolute inset-2 border border-dashed border-[rgb(var(--brand-500))]/20 rounded-full animate-spin-slow"></div>
                    <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/85"></div>
                    
                    <div className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-[bounce_2s_infinite]"></div>
                  </div>

                  <div className="w-full space-y-2">
                    <p className="text-[10px] text-[rgb(var(--text-secondary))] font-medium text-center truncate italic">
                      &gt; {scanMessage}
                    </p>
                    <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden">
                      <div className="h-full bg-[rgb(var(--brand-500))]" style={{ width: `${scanPercent}%` }}></div>
                    </div>
                  </div>
                </div>
              )}

              {scanStatus === 'error' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-5 pt-4">
                  <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-[rgb(var(--text-primary))]">Device Access Refused</h3>
                    <p className="text-[10px] text-[rgb(var(--text-secondary))] max-w-[200px] leading-normal">
                      Webcam blocked. Grant permissions or proceed with simulator simulation.
                    </p>
                  </div>
                  <Button
                    onClick={handleBypassScan}
                    className="w-full bg-gradient-brand text-white text-xs font-bold h-10 rounded-xl"
                  >
                    Simulate Fingerprint Match
                  </Button>
                </div>
              )}

              {scanStatus === 'verified' && (
                <div className="flex-1 flex flex-col justify-between p-1">
                  <div className="flex-1 flex flex-col justify-start pt-6 space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="font-extrabold text-sm text-[rgb(var(--text-primary))] tracking-tight flex items-center justify-center gap-1">
                        <Fingerprint className="w-4 h-4 text-emerald-455 animate-pulse" /> KeyShield 2FA
                      </h3>
                      <p className="text-[9px] text-emerald-400 uppercase font-extrabold tracking-widest">Biometrics Verified</p>
                    </div>

                    <div className="bg-black/40 border border-[rgb(var(--surface-200))] rounded-2xl p-4 text-center space-y-3 relative">
                      <span className="block text-[8px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">
                        ExamEve Root Console
                      </span>
                      <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] truncate">admin@exameve.com</p>
                      
                      <div className="py-2">
                        <span className="text-3xl font-black font-mono tracking-widest text-emerald-400 block drop-shadow-[0_0_12px_rgba(52,211,153,0.2)] animate-pulse">
                          {authCode.slice(0,3)} {authCode.slice(3,6)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${(timeLeft / 30) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] text-[rgb(var(--text-muted))] font-bold uppercase tracking-wider">
                          <span>Refreshes in</span>
                          <span>{timeLeft}s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pb-2">
                    <button
                      onClick={() => handleCopy(authCode, 'totp')}
                      className="w-full py-2 bg-black hover:bg-black/80 border border-[rgb(var(--surface-200))] text-[rgb(var(--text-secondary))] hover:text-slate-900 rounded-xl text-[10px] font-bold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      {copiedText === 'totp' ? (
                        <>Token Copied! <Check className="w-3.5 h-3.5 text-emerald-400" /></>
                      ) : (
                        <>Copy OTP Token <Copy className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-20 rounded-full bg-[rgb(var(--surface-300))]"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
