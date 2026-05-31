'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlanStore, PlanBlock } from '@/store/planStore'
import PlannerTimeline from '@/components/PlannerTimeline'
import FocusTimer from '@/components/FocusTimer'

export default function PlannerPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { plan, setPlan, activeBlock, setActiveBlock, startTimer, resetTimer } = usePlanStore()
  const [loading, setLoading] = useState(true)

  const fetchPlan = async () => {
    try {
      const response = await fetch('/api/graphql', {
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
      await fetch('/api/graphql', {
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
      await fetch('/api/graphql', {
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
    // Run rule-based replan
    await fetchPlan()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-900 tracking-tight">Your Custom Sprint Study Plan</h1>
            <p className="text-slate-600 mt-1">Adaptive schedule designed for your upcoming exam</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Dashboard
            </Button>
            <Button onClick={triggerReplan} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
              ⚡ Emergency Re-plan
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading plan...</div>
        ) : (
          <PlannerTimeline
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
