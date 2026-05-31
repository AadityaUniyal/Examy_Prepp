'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/graphql', {
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
              { name: 'Photosynthesis', confidence: 0.7 },
              { name: 'Cell Division', confidence: 0.5 },
              { name: 'Genetics', confidence: 0.3 }
            ],
            panicLevel: 'yellow'
          })
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

  const panicColors = {
    green: 'bg-green-100 border-green-300',
    yellow: 'bg-yellow-100 border-yellow-300',
    red: 'bg-red-100 border-red-300'
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Welcome, {session?.user?.name}!</h1>
          <p className="text-gray-600 mt-2">Let's get you exam-ready</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-5xl font-bold">{dashboard.daysLeft}</div>
                <div className="text-sm opacity-90">Days Left</div>
                <div className="text-3xl font-bold mt-2">{dashboard.hoursLeft}hrs</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-5xl font-bold">{dashboard.readinessScore}%</div>
                <div className="text-sm opacity-90">Readiness Score</div>
                <div className="mt-3 w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-white rounded-full h-2"
                    style={{ width: `${dashboard.readinessScore}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 ${panicColors[dashboard.panicLevel]}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {dashboard.panicLevel === 'green' ? '😌' : dashboard.panicLevel === 'yellow' ? '😐' : '😰'}
                </div>
                <div className="text-sm font-medium">Panic Meter</div>
                <div className="text-xs text-gray-600 mt-1 capitalize">
                  {dashboard.panicLevel}
                  {dashboard.panicLevel === 'green' ? ' - Focused' : dashboard.panicLevel === 'yellow' ? ' - Moderate' : ' - High'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button className="h-14 text-lg" variant="default">Start Study</Button>
          <Button className="h-14 text-lg" variant="outline">Take Quiz</Button>
          <Button className="h-14 text-lg" variant="outline">View Plan</Button>
          <Button className="h-14 text-lg" variant="outline">Re-plan</Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Today's Focus</CardTitle>
            <CardDescription>Top 3 topics to study today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.topicsFocused.map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{idx === 0 ? '🔥' : idx === 1 ? '⚡' : '💡'}</div>
                    <div>
                      <p className="font-medium">{topic.name}</p>
                      <p className="text-sm text-gray-600">Confidence: {Math.round(topic.confidence * 100)}%</p>
                    </div>
                  </div>
                  <Button variant="ghost">Study →</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Predicted Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">75%</div>
                <div className="text-sm text-gray-600 mt-1">Most Likely</div>
              </div>
              <div className="text-center">
                <div className="text-2xl text-orange-600">68% - 82%</div>
                <div className="text-sm text-gray-600 mt-1">Confidence Range (80%)</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-green-600 font-medium">↑ Improving</div>
                <div className="text-sm text-gray-600 mt-1">+5% from yesterday</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
