'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchWithAuth } from '@/lib/utils'
import MonteCarloWidget from '@/components/MonteCarloWidget'
import PYQNotesWidget from '@/components/PYQNotesWidget'
import { Calendar, ShieldAlert, Sparkles, Flame, Zap, CheckCircle2, AlertCircle, ArrowRight, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DashboardData {
  exam: {
    id: string
    name: string
    examDate: string
    totalMarks: number
  }
  readinessScore: number
  daysLeft: number
  hoursLeft: number
  topicsFocused: Array<{ name: string; confidence: number }>
  panicLevel: 'green' | 'yellow' | 'red'
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetchWithAuth('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query {
              myExams {
                id
                name
                examDate
                totalMarks
              }
              myNotifications {
                id
                message
                readAt
                createdAt
              }
            }`
          })
        })

        const result = await response.json()
        if (result.data?.myExams?.[0]) {
          setDashboard({
            exam: result.data.myExams[0],
            readinessScore: 65,
            daysLeft: 3,
            hoursLeft: 12,
            topicsFocused: [
              { name: 'Photosynthesis & Light Reactions', confidence: 0.7 },
              { name: 'Cell Division (Mitosis & Meiosis)', confidence: 0.5 },
              { name: 'Genetics & Mandelian Inheritance', confidence: 0.3 }
            ],
            panicLevel: 'yellow'
          })
        }
        if (result.data?.myNotifications) {
          setNotifications(result.data.myNotifications)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchDashboard()
    }

    const handlePanicRecovered = (e: Event) => {
      const customEvent = e as CustomEvent;
      setDashboard(prev => prev ? {
        ...prev,
        panicLevel: customEvent.detail?.status || 'green'
      } : null)
    }

    window.addEventListener('panic-recovered', handlePanicRecovered)
    return () => {
      window.removeEventListener('panic-recovered', handlePanicRecovered)
    }
  }, [session])

  const panicDetails = {
    green: {
      emoji: '😌',
      label: 'Calm & Focused',
      color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
      glow: 'shadow-emerald-500/5'
    },
    yellow: {
      emoji: '😐',
      label: 'Moderate Tension',
      color: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
      glow: 'shadow-amber-500/5'
    },
    red: {
      emoji: '😰',
      label: 'High Stress Alert',
      color: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
      glow: 'shadow-rose-500/5'
    }
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  const panicInfo = panicDetails[dashboard.panicLevel] || panicDetails.green

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Workspace Dashboard
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Welcome Back, {session?.user?.name || 'Student'}!
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Preparing for <span className="text-white font-semibold">{dashboard.exam.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-900 text-xs font-bold text-slate-400 shadow-inner">
          <Calendar className="w-4 h-4 text-indigo-400" />
          Exam Date: {new Date(dashboard.exam.examDate).toLocaleDateString()}
        </div>
      </div>

      {/* Top Level Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Days Left Card */}
        <Card className="bg-slate-900/40 backdrop-blur-2xl border-slate-800/80 shadow-2xl relative overflow-hidden h-40 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-sky-400"></div>
          <CardContent className="pt-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Countdown</span>
              <Flame className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-left mt-2">
              <div className="text-4xl font-black text-white tracking-tight">{dashboard.daysLeft} Days</div>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">Approximately {dashboard.hoursLeft} hours remaining</p>
            </div>
          </CardContent>
        </Card>

        {/* Readiness Score Card */}
        <Card className="bg-slate-900/40 backdrop-blur-2xl border-slate-800/80 shadow-2xl relative overflow-hidden h-40 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 to-emerald-500"></div>
          <CardContent className="pt-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Readiness Score</span>
              <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div className="text-left mt-2">
              <div className="text-4xl font-black text-emerald-400 tracking-tight">{dashboard.readinessScore}%</div>
              <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full h-1.5 transition-all duration-500"
                  style={{ width: `${dashboard.readinessScore}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panic Meter Card */}
        <Card className={`border ${panicInfo.color} shadow-2xl relative overflow-hidden h-40 flex flex-col justify-between transition-all duration-300`}>
          <CardContent className="pt-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Panic Protocol</span>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-left mt-2">
              <div className="text-3xl font-black text-white flex items-baseline gap-1.5 tracking-tight">
                <span className="text-4xl">{panicInfo.emoji}</span> {panicInfo.label}
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Stress metric: {dashboard.panicLevel.toUpperCase()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Study Streak Card */}
        <Card className="bg-slate-900/40 backdrop-blur-2xl border-slate-800/80 shadow-2xl relative overflow-hidden h-40 flex flex-col justify-between group hover:scale-[1.01] transition-transform">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse"></div>
          <CardContent className="pt-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Consistency Streak</span>
              <span className="text-xl animate-bounce">🔥</span>
            </div>
            <div className="text-left mt-2">
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 tracking-tight">
                5 Days
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                Autopilot Alignment: ACTIVE
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons Hub */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Button 
          onClick={() => router.push('/planner')}
          className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
        >
          Start Study Sprint
        </Button>
        <Button 
          onClick={() => router.push('/quiz')}
          className="h-14 rounded-2xl border-slate-800 bg-slate-900/30 hover:bg-slate-800/80 text-slate-200 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          variant="outline"
        >
          Adaptive Quiz
        </Button>
        <Button 
          onClick={() => router.push('/flashcards')}
          className="h-14 rounded-2xl border-slate-800 bg-slate-900/30 hover:bg-slate-800/80 text-slate-200 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          variant="outline"
        >
          Spaced Flashcards
        </Button>
        <Button 
          onClick={() => router.push('/mock-exam')}
          className="h-14 rounded-2xl border-indigo-500/20 bg-indigo-950/15 hover:bg-indigo-900/25 text-indigo-400 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/5"
          variant="outline"
        >
          AI Mock Exam
        </Button>
        <Button 
          onClick={() => router.push('/feedback')}
          className="h-14 rounded-2xl border-slate-800 bg-slate-900/30 hover:bg-slate-800/80 text-slate-200 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          variant="outline"
        >
          Feedback Support
        </Button>
      </div>

      {/* Main Grid: Today's Focus & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Today's Focus Card */}
        <Card className="bg-slate-900/40 backdrop-blur-2xl border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>
          <CardHeader>
            <CardTitle className="text-white font-black text-lg">Focus Priorities</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Top weightage topics requiring calibration study</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {dashboard.topicsFocused.map((topic, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-900/80 rounded-2xl hover:border-slate-800 hover:bg-slate-950/80 transition-all group cursor-pointer hover:scale-[1.01]"
                  onClick={() => router.push('/planner')}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-lg border border-slate-800">
                      {idx === 0 ? '🔥' : idx === 1 ? '⚡' : '💡'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{topic.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Calibrated Confidence: {Math.round(topic.confidence * 100)}%</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="text-indigo-400 hover:text-indigo-300 hover:bg-transparent flex items-center gap-1.5 text-xs font-bold transition-transform group-hover:translate-x-1"
                  >
                    Study <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Reminders */}
        <Card className="bg-slate-900/40 backdrop-blur-2xl border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>
          <CardHeader>
            <CardTitle className="text-white font-black text-lg">System Reminders</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Real-time study block deadlines and warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 italic">No alerts. Your preparation is perfectly aligned!</p>
                </div>
              ) : (
                notifications.slice(0, 4).map((n, idx) => (
                  <div key={idx} className="p-4 bg-slate-950/40 border border-slate-900/85 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-300">{n.message}</p>
                        <span className="text-[9px] font-bold text-slate-500 block mt-1 uppercase tracking-wider">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {!n.readAt && (
                      <span className="h-2 w-2 bg-indigo-500 rounded-full shrink-0 ml-3 animate-ping"></span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monte Carlo Simulator integration */}
      <MonteCarloWidget examId={dashboard.exam.id} />

      {/* RAG and PYQ Search Solvers */}
      <PYQNotesWidget examId={dashboard.exam.id} topics={dashboard.topicsFocused} />
    </div>
  )
}
