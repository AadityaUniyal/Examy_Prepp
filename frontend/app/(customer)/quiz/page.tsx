'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import QuizEngine, { Question } from '@/components/QuizEngine'
import { fetchWithAuth } from '@/lib/utils'

export default function QuizPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [topic, setTopic] = useState<{ id: string; name: string } | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const loadQuiz = async () => {
    // For demo/mock fallback
    setTopic({ id: 'topic-1', name: 'Photosynthesis & Respiration' })
    setQuestions([
      {
        question: 'Which pigment directly converts light energy to chemical energy in photosynthesis?',
        options: ['Chlorophyll b', 'Chlorophyll a', 'Xanthophyll', 'Carotenoids'],
        answerIndex: 1,
        explanation: 'Chlorophyll a is the primary photosynthetic pigment that participates directly in light reactions, whereas chlorophyll b and others are accessory pigments.'
      },
      {
        question: 'What is the primary site of dark reactions (Calvin Cycle) in chloroplasts?',
        options: ['Thylakoid membrane', 'Grana stroma linkers', 'Stroma', 'Inner membrane space'],
        answerIndex: 2,
        explanation: 'The light-independent reactions (Calvin Cycle) take place in the stroma of the chloroplast, utilizing ATP and NADPH generated in light reactions.'
      },
      {
        question: 'Which of the following is produced during glycolysis?',
        options: ['Pyruvic acid', 'Citric acid', 'Acetyl CoA', 'Oxaloacetate'],
        answerIndex: 0,
        explanation: 'Glycolysis is the pathway that converts glucose into pyruvic acid (pyruvate), yielding net 2 ATP and 2 NADH.'
      }
    ])
    setLoading(false)
  }

  useEffect(() => {
    loadQuiz()
  }, [session])

  const handleSubmitQuiz = async (scorePercent: number) => {
    setLoading(true)
    try {
      if (topic) {
        await fetchWithAuth('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation UpdateConfidence($topicId: ID!, $score: Float!) {
              updateConfidence(topicId: $topicId, score: $score) {
                id
                calibratedScore
              }
            }`,
            variables: {
              topicId: topic.id,
              score: scorePercent / 10
            }
          })
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[rgb(var(--text-primary))] p-4 md:p-8 relative overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 pb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent tracking-tight">
              Adaptive Assessment
            </h1>
            <p className="text-[rgb(var(--text-muted))] text-sm mt-1">Calibrating topic mastery scores in real-time</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            className="border-slate-200 bg-[rgb(var(--surface-0))]/60 hover:bg-slate-100/80 text-[rgb(var(--text-secondary))] rounded-xl"
          >
            Dashboard
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse font-bold tracking-widest text-xs uppercase">
            Preparing active-recall questions...
          </div>
        ) : (
          topic && (
            <QuizEngine
              topicName={topic.name}
              questions={questions}
              onSubmitQuiz={handleSubmitQuiz}
            />
          )
        )}
      </div>
    </div>
  )
}
