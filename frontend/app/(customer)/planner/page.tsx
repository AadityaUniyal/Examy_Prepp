'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlanStore, PlanBlock } from '@/store/planStore'
import PlannerTimeline from '@/components/PlannerTimeline'
import PlannerCalendar from '@/components/PlannerCalendar'
import FocusTimer from '@/components/FocusTimer'
import { fetchWithAuth } from '@/lib/utils'

export default function PlannerPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { plan, setPlan, activeBlock, setActiveBlock, startTimer, resetTimer } = usePlanStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'timeline' | 'calendar'>('timeline')

  const fetchPlan = async () => {
    try {
      const response = await fetchWithAuth('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query {
            activePlan {
              id
              planType
              totalHours
              isActive
              blocks {
                id
                durationMins
                blockType
                status
                priorityRank
                scheduledStart
                topic {
                  id
                  name
                  weightage
                  complexityScore
                  estimatedHours
                }
              }
            }
          }`
        })
      })
      const result = await response.json()
      if (result.data?.activePlan) {
        setPlan(result.data.activePlan)
      } else {
        // Mock plan fallback if none exists or API fails
        setPlan({
          id: 'mock-plan-id',
          planType: 'HOURS_48',
          totalHours: 48,
          isActive: true,
          blocks: [
            {
              id: 'block-1',
              scheduledStart: new Date(Date.now() + 300000).toISOString(),
              durationMins: 45,
              blockType: 'STUDY',
              status: 'PENDING',
              priorityRank: 1,
              topic: {
                id: 'topic-1',
                name: 'Photosynthesis & Respiration',
                weightage: 30,
                complexityScore: 0.6,
                estimatedHours: 6
              }
            },
            {
              id: 'block-2',
              scheduledStart: new Date(Date.now() + 3600000).toISOString(),
              durationMins: 15,
              blockType: 'BREAK',
              status: 'PENDING',
              priorityRank: 4,
              topic: {
                id: 'topic-break',
                name: 'Mindfulness Break',
                weightage: 0,
                complexityScore: 0,
                estimatedHours: 0
              }
            },
            {
              id: 'block-3',
              scheduledStart: new Date(Date.now() + 5400000).toISOString(),
              durationMins: 45,
              blockType: 'STUDY',
              status: 'PENDING',
              priorityRank: 2,
              topic: {
                id: 'topic-2',
                name: 'Genetics & Evolution',
                weightage: 25,
                complexityScore: 0.8,
                estimatedHours: 5
              }
            }
          ]
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlan()
  }, [session])

  const handleStartBlock = async (block: PlanBlock) => {
    setActiveBlock(block)
    resetTimer()
    startTimer()

    // Call mutation to notify start
    try {
      await fetchWithAuth('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation StartSession($blockId: ID!) {
            startSession(planBlockId: $blockId) {
              id
            }
          }`,
          variables: { blockId: block.id }
        })
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleSkipBlock = (blockId: string) => {
    if (!plan) return
    const updated = plan.blocks.map(b => b.id === blockId ? { ...b, status: 'SKIPPED' as const } : b)
    setPlan({ ...plan, blocks: updated })
  }

  const handleCompleteBlock = (blockId: string) => {
    if (!plan) return
    const updated = plan.blocks.map(b => b.id === blockId ? { ...b, status: 'COMPLETED' as const } : b)
    setPlan({ ...plan, blocks: updated })
  }

  const handleSessionComplete = async (feedback: { energyLevel: number; confidenceScore: number; notes: string }) => {
    if (!activeBlock) return
    
    // Save locally
    handleCompleteBlock(activeBlock.id)

    // Call EndSession mutation
    try {
      await fetchWithAuth('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation UpdateConfidence($topicId: ID!, $score: Float!) {
            updateConfidence(topicId: $topicId, score: $score) {
              id
            }
          }`,
          variables: {
            topicId: activeBlock.topic.id,
            score: parseFloat(feedback.confidenceScore.toString())
          }
        })
      })
    } catch (err) {
      console.error(err)
    }
  }

  const triggerReplan = async () => {
    setLoading(true)
    try {
      const examIdRes = await fetchWithAuth('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query {
            myExams {
              id
            }
          }`
        })
      })
      const examIdResult = await examIdRes.json()
      const examId = examIdResult.data?.myExams?.[0]?.id

      if (examId) {
        await fetchWithAuth('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation GeneratePlan($examId: ID!, $planType: String!) {
              generatePlan(examId: $examId, planType: $planType) {
                id
              }
            }`,
            variables: {
              examId,
              planType: plan?.planType || 'HOURS_48'
            }
          })
        })
      }
    } catch (err) {
      console.error('[Planner] Replan failed:', err)
    }
    await fetchPlan()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/50 pb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent tracking-tight">
              Adaptive Study Planner
            </h1>
            <p className="text-slate-400 text-sm mt-1">Calibrated sprint schedule generated by our AI model</p>
          </div>
          <div className="flex gap-2.5">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              className="border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 text-slate-300 rounded-xl"
            >
              Dashboard
            </Button>
            <Button 
              onClick={triggerReplan} 
              className="bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all hover:scale-[1.02] shadow-lg hover:shadow-amber-500/5 rounded-xl font-bold"
            >
              ⚡ Emergency Re-plan
            </Button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-900/60 backdrop-blur-xl border border-slate-900/80 p-1.5 rounded-2xl w-fit">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'timeline'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-transparent'
            }`}
          >
            Timeline View
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-transparent'
            }`}
          >
            Calendar View
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse font-bold tracking-widest text-xs uppercase">
            Recalibrating study blocks...
          </div>
        ) : activeTab === 'timeline' ? (
          <PlannerTimeline
            onStartBlock={handleStartBlock}
            onSkipBlock={handleSkipBlock}
            onCompleteBlock={handleCompleteBlock}
          />
        ) : (
          <PlannerCalendar
            onStartBlock={handleStartBlock}
            onSkipBlock={handleSkipBlock}
            onCompleteBlock={handleCompleteBlock}
          />
        )}

        <FocusTimer onSessionComplete={handleSessionComplete} />
      </div>
    </div>
  )
}
