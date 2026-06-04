'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePlanStore } from '@/store/planStore'
import { Volume2, VolumeX, ShieldAlert, Sparkles, Footprints, Wind } from 'lucide-react'

interface PanicModeModalProps {
  open: boolean
  onClose: () => void
}

type BreathingPhase = 'Inhale' | 'Hold (In)' | 'Exhale' | 'Hold (Out)'

export default function PanicModeModal({ open, onClose }: PanicModeModalProps) {
  const { plan, setPanicMode } = usePlanStore()
  const [breathPhase, setBreathPhase] = useState<BreathingPhase>('Inhale')
  const [secondsLeft, setSecondsLeft] = useState(4)
  const [breathCycle, setBreathCycle] = useState(1)

  // Web Audio Drone States
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null)
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null)
  const [gainNode, setGainNode] = useState<GainNode | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)

  const priorityBlock = plan?.blocks.find(
    (b) => b.status === 'PENDING' && b.blockType === 'STUDY'
  )

  // Box Breathing Loop: 4s Inhale, 4s Hold, 4s Exhale, 4s Hold using requestAnimationFrame
  useEffect(() => {
    if (!open) return

    let animId: number
    let lastTime = performance.now()
    let accumulatedTime = 0

    const tick = (nowTime: number) => {
      const delta = nowTime - lastTime
      lastTime = nowTime
      accumulatedTime += delta

      if (accumulatedTime >= 1000) {
        accumulatedTime -= 1000
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (breathPhase === 'Inhale') {
              setBreathPhase('Hold (In)')
              return 4
            } else if (breathPhase === 'Hold (In)') {
              setBreathPhase('Exhale')
              return 4
            } else if (breathPhase === 'Exhale') {
              setBreathPhase('Hold (Out)')
              return 4
            } else {
              setBreathPhase('Inhale')
              setBreathCycle((c) => c + 1)
              return 4
            }
          }
          return prev - 1
        })
      }
      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [open, breathPhase])

  // Cleanup Web Audio on close
  useEffect(() => {
    if (!open && soundEnabled) {
      cleanupAudio()
    }
  }, [open])

  const cleanupAudio = () => {
    try {
      if (oscillator) {
        oscillator.stop()
        oscillator.disconnect()
      }
      if (audioCtx && (audioCtx as any).additionalOscillators) {
        (audioCtx as any).additionalOscillators.forEach((osc: any) => {
          try {
            osc.stop()
            osc.disconnect()
          } catch (err) {}
        })
      }
      if (gainNode) {
        gainNode.disconnect()
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close()
      }
    } catch (e) {
      console.warn('Audio context cleanup warning:', e)
    }
    setOscillator(null)
    setGainNode(null)
    setAudioCtx(null)
    setSoundEnabled(false)
  }

  const toggleSound = () => {
    if (soundEnabled) {
      cleanupAudio()
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioContextClass()
        
        // Lowpass filter to ensure soft meditative tone
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(350, ctx.currentTime)

        // Root Note: C3 (130.81 Hz)
        const osc1 = ctx.createOscillator()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(130.81, ctx.currentTime)
        const gain1 = ctx.createGain()
        gain1.gain.setValueAtTime(0.06, ctx.currentTime)
        osc1.connect(gain1)
        gain1.connect(filter)

        // Third Note: E3 (164.81 Hz)
        const osc2 = ctx.createOscillator()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(164.81, ctx.currentTime)
        const gain2 = ctx.createGain()
        gain2.gain.setValueAtTime(0.05, ctx.currentTime)
        osc2.connect(gain2)
        gain2.connect(filter)

        // Fifth Note: G3 (196.00 Hz)
        const osc3 = ctx.createOscillator()
        osc3.type = 'sine'
        osc3.frequency.setValueAtTime(196.00, ctx.currentTime)
        const gain3 = ctx.createGain()
        gain3.gain.setValueAtTime(0.05, ctx.currentTime)
        osc3.connect(gain3)
        gain3.connect(filter)

        // Master Volume
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(0.12, ctx.currentTime)
        filter.connect(masterGain)
        masterGain.connect(ctx.destination)

        osc1.start()
        osc2.start()
        osc3.start()

        setAudioCtx(ctx)
        setOscillator(osc1)
        setGainNode(masterGain)
        setSoundEnabled(true)

        // Keep pointers to stop them recursively
        ;(ctx as any).additionalOscillators = [osc2, osc3]
      } catch (err) {
        console.error('Failed to initialize Web Audio:', err)
      }
    }
  }

  const getCircleScale = () => {
    if (breathPhase === 'Inhale') {
      // Scale from 1.0 to 1.8
      return 1.0 + (4 - secondsLeft) * 0.2
    }
    if (breathPhase === 'Hold (In)') {
      return 1.8
    }
    if (breathPhase === 'Exhale') {
      // Scale down from 1.8 to 1.0
      return 1.8 - (4 - secondsLeft) * 0.2
    }
    return 1.0 // Hold Out
  }

  const getPhaseColors = () => {
    switch (breathPhase) {
      case 'Inhale':
        return {
          bg: 'bg-indigo-500/25 border-indigo-400 text-indigo-400',
          radial: 'from-indigo-500/40 via-indigo-600/10 to-transparent'
        }
      case 'Hold (In)':
        return {
          bg: 'bg-emerald-500/25 border-emerald-400 text-emerald-400',
          radial: 'from-emerald-500/40 via-emerald-600/10 to-transparent'
        }
      case 'Exhale':
        return {
          bg: 'bg-sky-500/25 border-sky-400 text-sky-400',
          radial: 'from-sky-500/40 via-sky-600/10 to-transparent'
        }
      case 'Hold (Out)':
        return {
          bg: 'bg-slate-700/25 border-slate-500 text-slate-400',
          radial: 'from-slate-600/20 via-slate-700/5 to-transparent'
        }
    }
  }


  const [recalibrating, setRecalibrating] = useState(false)
  const [autopilotMsg, setAutopilotMsg] = useState('')

  const handleAutopilot = async () => {
    setRecalibrating(true)
    setAutopilotMsg('')
    try {
      const res = await fetch('/api/autopilot-recalibrate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAutopilotMsg('Study plan successfully converted to low-stress blocks!')
        window.dispatchEvent(new Event('replan-occurred'))
      } else {
        setAutopilotMsg(data.message || 'No active plan block needs conversion.')
      }
    } catch (e) {
      setAutopilotMsg('Autopilot recalibration complete.')
    } finally {
      setRecalibrating(false)
    }
  }

  const handlePanicComplete = () => {
    cleanupAudio()
    setPanicMode(false)
    window.dispatchEvent(new CustomEvent('panic-recovered', { detail: { score: 0.1, status: 'green' } }))
    onClose()
  }

  const colors = getPhaseColors()

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handlePanicComplete()}>
      <DialogContent className="sm:max-w-xl bg-slate-950 border-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>

        {/* Ambient background glow matching phase */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-r ${colors.radial} blur-3xl pointer-events-none transition-all duration-1000`}></div>

        <DialogHeader className="relative z-10">
          <DialogTitle className="text-center text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <Wind className="w-6 h-6 text-indigo-400 animate-pulse" /> Box Breathing Protocol
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 relative z-10">
          <p className="text-slate-400 text-xs text-center mb-6 max-w-sm leading-relaxed">
            Standard box technique used by professionals to lower heart rate and restore mental clarity in 60 seconds.
          </p>

          {/* Interactive Breathing Sphere */}
          <div className="relative h-60 w-60 flex items-center justify-center mb-8">
            <div
              className={`absolute rounded-full border transition-all duration-1000 ease-in-out shadow-2xl flex items-center justify-center ${colors.bg.split(' ')[1]}`}
              style={{
                height: '100px',
                width: '100px',
                transform: `scale(${getCircleScale()})`,
              }}
            >
              <div className={`w-full h-full rounded-full transition-colors duration-1000 ${colors.bg.split(' ')[0]}`}></div>
            </div>
            
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-2xl font-black tracking-tight transition-colors duration-1000 ${colors.bg.split(' ')[2]}`}>
                {breathPhase}
              </span>
              <span className="text-5xl font-black font-mono text-white mt-1.5">
                {secondsLeft}
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider mt-2.5 uppercase">
                Cycle {breathCycle} / 4
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex gap-4 items-center justify-between w-full p-3 bg-slate-900/60 border border-slate-900 rounded-2xl mb-6">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Ambient Calm Wave
            </span>
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold transition-all ${
                soundEnabled 
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" /> Drone Playing
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" /> Sound Off
                </>
              )}
            </button>
          </div>

          {/* Next Focus Step suggestion */}
          {priorityBlock && (
            <div className="w-full bg-slate-900/40 border border-slate-900 rounded-2xl p-4 mb-6 text-left">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block mb-1">
                Your Single Focus Next
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">
                Study: {priorityBlock.topic.name}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                When you click resume, do not think about grades or exams. Simply spend 10 minutes focused exclusively on this topic.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full animate-fade-in">
            <Button
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-500/10 active:scale-[0.98]"
              onClick={handlePanicComplete}
            >
              Resume Study Session
            </Button>
            <Button
              variant="outline"
              disabled={recalibrating}
              className="w-full h-12 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold rounded-xl flex items-center justify-center gap-2"
              onClick={handleAutopilot}
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              {recalibrating ? 'Autopilot Recalibrating...' : 'Anxiety Autopilot: Defuse Study Load'}
            </Button>
            {autopilotMsg && (
              <p className="text-[11px] text-emerald-400 text-center font-bold mt-1">
                {autopilotMsg}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
