import { useEffect, useState } from 'react'
import { usePlanStore } from '@/store/planStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

interface FocusTimerProps {
  onSessionComplete: (data: { energyLevel: number; confidenceScore: number; notes: string }) => void
}

export default function FocusTimer({ onSessionComplete }: FocusTimerProps) {
  const {
    activeBlock,
    timerRunning,
    secondsElapsed,
    startTimer,
    stopTimer,
    tickTimer,
    resetTimer,
    setActiveBlock
  } = usePlanStore()

  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [energyLevel, setEnergyLevel] = useState(3)
  const [confidenceScore, setConfidenceScore] = useState(5)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerRunning) {
      interval = setInterval(() => {
        tickTimer()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, tickTimer])

  if (!activeBlock) return null

  const targetSeconds = activeBlock.durationMins * 60
  const remainingSeconds = Math.max(0, targetSeconds - secondsElapsed)
  const progressPercent = Math.min(100, (secondsElapsed / targetSeconds) * 100)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handlePauseResume = () => {
    if (timerRunning) {
      stopTimer()
    } else {
      startTimer()
    }
  }

  const handleFinishEarly = () => {
    stopTimer()
    setShowFeedbackModal(true)
  }

  const handleFeedbackSubmit = () => {
    onSessionComplete({
      energyLevel,
      confidenceScore,
      notes
    })
    setShowFeedbackModal(false)
    resetTimer()
    setActiveBlock(null)
  }

  // Auto-finish when time reaches target
  if (remainingSeconds === 0 && timerRunning) {
    stopTimer()
    setShowFeedbackModal(true)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-slow">
      <Card className="w-80 shadow-2xl border-indigo-200 bg-white/90 backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between text-indigo-900">
            <span>Focusing on {activeBlock.topic.name}</span>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold font-mono tracking-wider text-slate-800">
              {formatTime(remainingSeconds)}
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-indigo-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={timerRunning ? 'outline' : 'default'}
              onClick={handlePauseResume}
            >
              {timerRunning ? 'Pause' : 'Resume'}
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={handleFinishEarly}
            >
              Finish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-indigo-900 font-bold text-xl">Session Completed!</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                How is your energy level? (1-5 Stars)
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEnergyLevel(star)}
                    className="text-3xl transition-transform hover:scale-125"
                  >
                    {star <= energyLevel ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Confidence Score (Topic: {activeBlock.topic.name})
              </label>
              <div className="px-2">
                <Slider
                  defaultValue={[confidenceScore]}
                  max={10}
                  step={1}
                  onValueChange={(val) => setConfidenceScore(val[0])}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>0 - Confused</span>
                  <span className="text-indigo-600 font-semibold">{confidenceScore}/10</span>
                  <span>10 - Mastered</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Study Notes (Optional)
              </label>
              <Input
                placeholder="What did you learn or struggle with?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full"
              />
            </div>

            <Button onClick={handleFeedbackSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Submit & End Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
