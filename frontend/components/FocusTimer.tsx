import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePlanStore } from '@/store/planStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { socket, connectSocket, disconnectSocket } from '@/lib/socket'
import AIAssistant from '@/components/AIAssistant'
import { triggerConfetti } from '@/lib/confetti'

interface FocusTimerProps {
  onSessionComplete: (data: { energyLevel: number; confidenceScore: number; notes: string }) => void
}

export default function FocusTimer({ onSessionComplete }: FocusTimerProps) {
  const { data: session } = useSession()
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
  const [activePeers, setActivePeers] = useState(1)

  const [activeSound, setActiveSound] = useState<'none' | 'lofi' | 'rain' | 'cafe'>('none')
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null)

  const handleSoundChange = (sound: 'none' | 'lofi' | 'rain' | 'cafe') => {
    if (audioObj) {
      audioObj.pause()
      audioObj.src = ''
    }

    if (sound === 'none') {
      setActiveSound('none')
      setAudioObj(null)
      return
    }

    let url = ''
    if (sound === 'lofi') url = 'https://api.coderadio.freecodecamp.org/radio/8010/radio.mp3'
    else if (sound === 'rain') url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    else if (sound === 'cafe') url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'

    const audio = new Audio(url)
    audio.loop = true
    audio.volume = 0.25
    audio.play().catch(e => console.log('Audio autoplay blocked: ', e))

    setActiveSound(sound)
    setAudioObj(audio)
  }

  useEffect(() => {
    return () => {
      if (audioObj) {
        audioObj.pause()
      }
    }
  }, [audioObj])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerRunning) {
      interval = setInterval(() => {
        tickTimer()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, tickTimer])

  // Establish socket connection, join peer lounge, and emit start-session when active block starts
  useEffect(() => {
    if (activeBlock && timerRunning) {
      connectSocket()
      socket.emit('start-session', {
        userId: session?.user?.email || 'mock-student-123',
        blockId: activeBlock.id,
        topicId: activeBlock.topic.id
      })
      
      // Join real-time peer study lounge
      socket.emit('join-lounge', { topicId: activeBlock.topic.id })
      
      socket.on('lounge-status', (data) => {
        if (data.topicId === activeBlock.topic.id) {
          setActivePeers(data.activePeersCount)
        }
      })
    }
    
    return () => {
      if (activeBlock) {
        socket.emit('leave-lounge', { topicId: activeBlock.topic.id })
      }
      socket.off('lounge-status')
      if (!timerRunning) {
        disconnectSocket()
      }
    }
  }, [activeBlock, timerRunning, session])

  // Emit session progress update to the backend on tick
  useEffect(() => {
    if (activeBlock && timerRunning && secondsElapsed > 0) {
      socket.emit('session-progress', {
        userId: session?.user?.email || 'mock-student-123',
        blockId: activeBlock.id,
        secondsElapsed,
        progressPercent: Math.min(100, (secondsElapsed / (activeBlock.durationMins * 60)) * 100)
      })
    }
  }, [secondsElapsed, activeBlock, timerRunning, session])

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
    triggerConfetti()
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Real-time Peer Lounge Count badge */}
      {timerRunning && (
        <div className="bg-slate-900/90 text-indigo-300 border border-slate-800 rounded-full px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1.5 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {activePeers} {activePeers === 1 ? 'Peer' : 'Peers'} studying this now
        </div>
      )}

      <Card className="w-80 shadow-2xl border-indigo-500/25 bg-slate-900/95 border border-slate-800 text-white backdrop-blur-xl rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-sky-400"></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold flex items-center justify-between text-slate-350">
            <span className="truncate max-w-[200px]">Studying: {activeBlock.topic.name}</span>
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold font-mono tracking-wider text-white">
              {formatTime(remainingSeconds)}
            </div>
            <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-indigo-500 to-sky-450 rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 text-xs font-bold rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/80 text-white"
              variant={timerRunning ? 'outline' : 'default'}
              onClick={handlePauseResume}
            >
              {timerRunning ? 'Pause' : 'Resume'}
            </Button>
            <Button
              className="flex-1 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              variant="secondary"
              onClick={handleFinishEarly}
            >
              Finish
            </Button>
          </div>

          {/* Study Soundscapes Selector */}
          {timerRunning && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-1.5 animate-fade-in">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ambient Audio</span>
              <div className="flex gap-1">
                {(['none', 'lofi', 'rain', 'cafe'] as const).map((sound) => (
                  <button
                    key={sound}
                    onClick={() => handleSoundChange(sound)}
                    className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                      activeSound === sound
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                        : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    {sound}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating AI Study Buddy chatbot trigger */}
      <AIAssistant topicId={activeBlock.topic.id} topicName={activeBlock.topic.name} />

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-md bg-slate-950 border border-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl relative p-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>

          <DialogHeader>
            <DialogTitle className="text-white font-black text-xl tracking-tight flex items-center gap-2">
              ✨ Session Completed!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4 relative z-10">
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                How is your energy level?
              </label>
              <div className="flex gap-3 justify-center py-2 bg-slate-900/40 rounded-2xl border border-slate-900">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEnergyLevel(star)}
                    className="text-3xl transition-all duration-150 hover:scale-125 focus:outline-none"
                  >
                    {star <= energyLevel ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                New Confidence Score ({activeBlock.topic.name})
              </label>
              <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-900 space-y-3">
                <Slider
                  defaultValue={[confidenceScore]}
                  max={10}
                  step={1}
                  onValueChange={(val) => setConfidenceScore(val[0])}
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>0 - Confused</span>
                  <span className="text-indigo-450 font-extrabold">{confidenceScore}/10</span>
                  <span>10 - Mastered</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Study Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="What did you learn or struggle with?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              />
            </div>

            <Button 
              onClick={handleFeedbackSubmit} 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
            >
              Submit & End Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
