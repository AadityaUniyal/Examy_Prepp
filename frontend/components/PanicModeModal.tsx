import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePlanStore } from '@/store/planStore'

interface PanicModeModalProps {
  open: boolean
  onClose: () => void
}

export default function PanicModeModal({ open, onClose }: PanicModeModalProps) {
  const { plan, setPanicMode } = usePlanStore()
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')
  const [secondsLeft, setSecondsLeft] = useState(4)
  const [breathCycle, setBreathCycle] = useState(1)

  // Find the top priority block to study next
  const priorityBlock = plan?.blocks.find(
    (b) => b.status === 'PENDING' && b.blockType === 'STUDY'
  )

  useEffect(() => {
    if (!open) return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (breathPhase === 'Inhale') {
            setBreathPhase('Hold')
            return 7
          } else if (breathPhase === 'Hold') {
            setBreathPhase('Exhale')
            return 8
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

  const getCircleScale = () => {
    if (breathPhase === 'Inhale') return 1 + (4 - secondsLeft) * 0.2
    if (breathPhase === 'Hold') return 1.8
    return 1.8 - (8 - secondsLeft) * 0.1
  }

  const getPhaseColor = () => {
    if (breathPhase === 'Inhale') return 'bg-cyan-500 shadow-cyan-300'
    if (breathPhase === 'Hold') return 'bg-teal-500 shadow-teal-300'
    return 'bg-blue-500 shadow-blue-300'
  }

  const handlePanicComplete = () => {
    setPanicMode(false)
    // Dispatch system events so other listeners can update UI/panic metrics
    window.dispatchEvent(new CustomEvent('panic-recovered', { detail: { score: 0.1, status: 'green' } }))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handlePanicComplete()}>
      <DialogContent className="sm:max-w-xl bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold tracking-tight text-cyan-400">
            🌬️ Panic Recovery Mode
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-8">
          <p className="text-slate-300 text-center mb-8 max-w-sm">
            Take a moment to calm down. Let's do a quick 4-7-8 breathing session.
          </p>

          {/* Breathing Visualizer */}
          <div className="relative h-60 w-60 flex items-center justify-center mb-8">
            <div
              className={`rounded-full transition-all duration-1000 ease-in-out opacity-80 shadow-2xl ${getPhaseColor()}`}
              style={{
                height: '100px',
                width: '100px',
                transform: `scale(${getCircleScale()})`,
              }}
            />
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono text-white tracking-wide">
                {breathPhase}
              </span>
              <span className="text-4xl font-extrabold font-mono text-cyan-200 mt-1">
                {secondsLeft}
              </span>
              <span className="text-xs text-slate-300 mt-2 font-medium">
                Cycle {breathCycle}/4
              </span>
            </div>
          </div>

          {/* Action card */}
          {priorityBlock && (
            <div className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 mb-6 shadow-lg">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest block mb-1">
                Your Next Step
              </span>
              <h4 className="text-lg font-bold text-white mb-2">
                Study "{priorityBlock.topic.name}"
              </h4>
              <p className="text-sm text-slate-300">
                Forget everything else for now. Just block out 20 minutes to read this single topic.
              </p>
            </div>
          )}

          <div className="flex gap-4 w-full">
            <Button
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 font-semibold"
              onClick={handlePanicComplete}
            >
              Resume Study
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
