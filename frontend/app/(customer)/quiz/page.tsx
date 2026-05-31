'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import QuizEngine, { Question } from '@/components/QuizEngine'

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
        await fetch('/api/graphql', {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-900 tracking-tight">Adaptive Quiz</h1>
            <p className="text-slate-600 mt-1">Calibrating your confidence level using active recall</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Dashboard
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading quiz content...</div>
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
