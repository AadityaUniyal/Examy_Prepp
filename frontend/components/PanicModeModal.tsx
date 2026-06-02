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

  // Box Breathing Loop: 4s Inhale, 4s Hold, 4s Exhale, 4s Hold
  useEffect(() => {
    if (!open) return

    const interval = setInterval(() => {
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
    }, 1000)

    return () => clearInterval(interval)
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
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // 136.1 Hz (Om/Earth frequency) - deeply calming low drone
        osc.type = 'sine'
        osc.frequency.setValueAtTime(136.1, ctx.currentTime)

        // Add a second harmonic oscillator to enrich the sound
        const oscHarmonic = ctx.createOscillator()
        oscHarmonic.type = 'triangle'
        oscHarmonic.frequency.setValueAtTime(272.2, ctx.currentTime) // octave higher
        const gainHarmonic = ctx.createGain()
        gainHarmonic.gain.setValueAtTime(0.02, ctx.currentTime)
        oscHarmonic.connect(gainHarmonic)
        gainHarmonic.connect(ctx.destination)

        gain.gain.setValueAtTime(0.08, ctx.currentTime) // low volume
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start()
        oscHarmonic.start()

        setAudioCtx(ctx)
        setOscillator(osc)
        setGainNode(gain)
        setSoundEnabled(true)
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

          <div className="flex gap-4 w-full">
            <Button
              className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-500/10 active:scale-[0.98]"
              onClick={handlePanicComplete}
            >
              Resume Study Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
