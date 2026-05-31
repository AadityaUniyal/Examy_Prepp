'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

interface Topic {
  name: string
  weightage: number
  estimatedHours: number
  confidence: number
}

export default function SyllabusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examId = searchParams.get('examId')

  const [mode, setMode] = useState<'options' | 'template' | 'manual'>('options')
  const [topics, setTopics] = useState<Topic[]>([])
  const [newTopic, setNewTopic] = useState({ name: '', weightage: 20, estimatedHours: 4 })
  const [saving, setSaving] = useState(false)

  const templates = [
    {
      name: 'Class 12 Biology (CBSE)',
      topics: [
        { name: 'Photosynthesis & Respiration', weightage: 30, estimatedHours: 6, confidence: 5 },
        { name: 'Cell Structure & Division', weightage: 25, estimatedHours: 5, confidence: 6 },
        { name: 'Genetics & Evolution', weightage: 25, estimatedHours: 5, confidence: 3 },
        { name: 'Ecology & Environment', weightage: 20, estimatedHours: 4, confidence: 7 }
      ]
    },
    {
      name: 'JEE Physics Mechanics',
      topics: [
        { name: 'Kinematics & Newton Laws', weightage: 35, estimatedHours: 8, confidence: 4 },
        { name: 'Work, Power & Energy', weightage: 25, estimatedHours: 6, confidence: 5 },
        { name: 'Rotational Motion', weightage: 20, estimatedHours: 5, confidence: 2 },
        { name: 'Gravitation & Oscillation', weightage: 20, estimatedHours: 4, confidence: 6 }
      ]
    }
  ]

  const handleSelectTemplate = (templateIndex: number) => {
    setTopics(templates[templateIndex].topics)
    setMode('manual') // Go to details editing
  }

  const handleAddTopic = () => {
    if (!newTopic.name) return
    setTopics([...topics, { ...newTopic, confidence: 5 }])
    setNewTopic({ name: '', weightage: 20, estimatedHours: 4 })
  }

  const handleConfidenceChange = (index: number, score: number) => {
    const updated = [...topics]
    updated[index].confidence = score
    setTopics(updated)
  }

  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index))
  }

  const handleSaveSyllabus = async () => {
    if (topics.length === 0) return
    setSaving(true)

    try {
      // 1. Add topics
      const addRes = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation AddTopics($examId: ID!, $topics: [TopicInput!]!) {
            addTopics(examId: $examId, topics: $topics) {
              id
              name
            }
          }`,
          variables: {
            examId,
            topics: topics.map(t => ({
              name: t.name,
              weightage: parseFloat(t.weightage.toString()),
              estimatedHours: parseFloat(t.estimatedHours.toString())
            }))
          }
        })
      })

      const addResult = await addRes.json()
      
      // Update confidence for each topic (silently in backend/frontend context)
      // Note: we can run confidence updates sequentially or let backend use defaults
      
      // 2. Generate Plan
      await fetch('/api/graphql', {
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
            planType: 'HOURS_48'
          }
        })
      })

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-800">Syllabus Setup</CardTitle>
          <CardDescription>Specify the topics you need to prepare for this exam</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'options' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className="p-6 cursor-pointer hover:border-indigo-500 transition-all border border-slate-100 text-center space-y-2"
                  onClick={() => setMode('template')}
                >
                  <div className="text-4xl">📚</div>
                  <h3 className="font-bold text-slate-800">Template Library</h3>
                  <p className="text-xs text-slate-500">Choose from pre-defined standard exams & boards</p>
                </Card>
                <Card
                  className="p-6 cursor-pointer hover:border-indigo-500 transition-all border border-slate-100 text-center space-y-2"
                  onClick={() => setMode('manual')}
                >
                  <div className="text-4xl">✏️</div>
                  <h3 className="font-bold text-slate-800">Manual Entry</h3>
                  <p className="text-xs text-slate-500">Input your topics, weights, and ratings manually</p>
                </Card>
              </div>
              <div className="flex justify-start">
                <Button variant="outline" onClick={() => router.back()}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {mode === 'template' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Select standard syllabus template</h3>
              <div className="space-y-2">
                {templates.map((tpl, i) => (
                  <div
                    key={i}
                    className="p-4 border rounded-lg hover:border-indigo-500 cursor-pointer flex justify-between items-center transition"
                    onClick={() => handleSelectTemplate(i)}
                  >
                    <div>
                      <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                      <p className="text-xs text-slate-500">{tpl.topics.length} core topics included</p>
                    </div>
                    <Button variant="ghost">Select →</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => setMode('options')}>
                Back
              </Button>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-6">
              {/* Form to add a new topic */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-4 border border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm">Add New Topic</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="e.g., Photosynthesis"
                    value={newTopic.name}
                    onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Weight %"
                    min="1"
                    max="100"
                    value={newTopic.weightage}
                    onChange={(e) => setNewTopic({ ...newTopic, weightage: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    placeholder="Est. Hours"
                    min="1"
                    value={newTopic.estimatedHours}
                    onChange={(e) => setNewTopic({ ...newTopic, estimatedHours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <Button onClick={handleAddTopic} size="sm" className="bg-slate-950 hover:bg-slate-900">
                  Add Topic to List
                </Button>
              </div>

              {/* Added topics list with confidence ratings */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800">Topics & Initial Confidence</h3>
                {topics.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No topics added yet. Add some above or use templates.</p>
                ) : (
                  <div className="space-y-3">
                    {topics.map((t, idx) => (
                      <div key={idx} className="p-4 border rounded-lg space-y-3 bg-white">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-bold text-slate-800">{t.name}</h5>
                            <p className="text-xs text-slate-500">
                              Weightage: {t.weightage}% | Est. Hours: {t.estimatedHours} hrs
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleRemoveTopic(idx)}>
                            Remove
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span>How well do you know this topic right now?</span>
                            <span className="text-indigo-600 font-semibold">{t.confidence}/10</span>
                          </div>
                          <Slider
                            defaultValue={[t.confidence]}
                            max={10}
                            step={1}
                            onValueChange={(val) => handleConfidenceChange(idx, val[0])}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setMode('options')}>
                  Back
                </Button>
                <Button
                  onClick={handleSaveSyllabus}
                  disabled={topics.length === 0 || saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow"
                >
                  {saving ? 'Creating plan...' : 'Generate Plan & Dashboard →'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
