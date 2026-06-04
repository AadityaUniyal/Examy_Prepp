'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { fetchWithAuth } from '@/lib/utils'
import { Sparkles, ArrowLeft, UploadCloud, Library, PlusCircle, Trash, Settings } from 'lucide-react'

interface Topic {
  name: string
  weightage: number
  estimatedHours: number
  confidence: number
}

function SyllabusPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examId = searchParams.get('examId')

  const [mode, setMode] = useState<'options' | 'template' | 'manual' | 'pdf'>('options')
  const [topics, setTopics] = useState<Topic[]>([])
  const [newTopic, setNewTopic] = useState({ name: '', weightage: 20, estimatedHours: 4 })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !examId) return
    setUploading(true)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('examId', examId)

  try {
      const res = await fetchWithAuth('/api/upload-syllabus', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success && data.topics) {
        setTopics(data.topics.map((t: any) => ({
          name: t.name,
          weightage: Math.round(t.weightage) || 10,
          estimatedHours: t.estimatedHours || 2,
          confidence: 5
        })))
        setMode('manual')
      } else {
        alert(data.error || 'Failed to parse syllabus PDF')
      }
    } catch (err) {
      console.error(err)
      alert('Error uploading and parsing syllabus')
    } finally {
      setUploading(false)
    }
  }

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
    setMode('manual')
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
      await fetchWithAuth('/api/graphql', {
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

      // 2. Generate Plan
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Visual background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

      <Card className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        {/* Glowing border line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>

        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-black bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
            Syllabus Configuration
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Upload a syllabus PDF, select a library template, or enter study topics manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'options' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="bg-slate-950/40 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/80 text-center space-y-3 cursor-pointer p-5 rounded-2xl transition-all duration-200 premium-card-hover"
                  onClick={() => setMode('template')}
                >
                  <div className="h-10 w-10 mx-auto rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Library className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-200">Template Library</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Choose from pre-defined standard exams</p>
                </div>

                <div
                  className="bg-slate-950/40 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950/80 text-center space-y-3 cursor-pointer p-5 rounded-2xl transition-all duration-200 premium-card-hover"
                  onClick={() => setMode('manual')}
                >
                  <div className="h-10 w-10 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-200">Manual Entry</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Input your topics and details manually</p>
                </div>

                <div
                  className="bg-slate-950/40 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-950/80 text-center space-y-3 cursor-pointer p-5 rounded-2xl transition-all duration-200 premium-card-hover"
                  onClick={() => setMode('pdf')}
                >
                  <div className="h-10 w-10 mx-auto rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-200">AI PDF Extract</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Automatically extract topics from PDF file</p>
                </div>
              </div>
              <div className="flex justify-start">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="border-slate-800 bg-slate-900/20 hover:bg-slate-800/60 text-slate-350 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </div>
            </div>
          )}

          {mode === 'pdf' && (
            <div className="space-y-6 py-4 text-center">
              <div className="max-w-md mx-auto p-8 border-2 border-dashed border-slate-800 bg-slate-950/20 rounded-2xl flex flex-col items-center justify-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-2">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-250 text-base">Select Exam Syllabus PDF</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Our AI models extract chapters, topic weights, and estimate study hours.</p>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="pdf-upload-input"
                  disabled={uploading}
                />
                <label
                  htmlFor="pdf-upload-input"
                  className={`cursor-pointer inline-flex items-center justify-center rounded-xl font-bold transition-all shadow-lg active:scale-95 bg-indigo-600 text-white hover:bg-indigo-700 h-11 px-5 text-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploading ? 'Processing Syllabus PDF...' : 'Choose File'}
                </label>
              </div>
              <div className="flex justify-start">
                <Button 
                  variant="outline" 
                  onClick={() => setMode('options')}
                  className="border-slate-800 bg-slate-900/20 hover:bg-slate-800/60 text-slate-350 rounded-xl"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {mode === 'template' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select standard syllabus template</h3>
              <div className="space-y-2.5">
                {templates.map((tpl, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-950/20 border border-slate-800 hover:border-indigo-500/30 rounded-2xl cursor-pointer flex justify-between items-center transition-all duration-150 hover:bg-slate-950/50"
                    onClick={() => handleSelectTemplate(i)}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{tpl.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{tpl.topics.length} core topics included</p>
                    </div>
                    <Button variant="ghost" className="text-indigo-400 hover:text-indigo-300 text-xs font-bold hover:bg-transparent">Select →</Button>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setMode('options')}
                  className="border-slate-800 bg-slate-900/20 hover:bg-slate-800/60 text-slate-350 rounded-xl"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-6">
              {/* Form to add a new topic */}
              <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-400" /> Add New Topic
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="e.g., Photosynthesis"
                    value={newTopic.name}
                    onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Weight %"
                    min="1"
                    max="100"
                    value={newTopic.weightage || ''}
                    onChange={(e) => setNewTopic({ ...newTopic, weightage: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Est. Hours"
                    min="1"
                    value={newTopic.estimatedHours || ''}
                    onChange={(e) => setNewTopic({ ...newTopic, estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <Button 
                  onClick={handleAddTopic} 
                  size="sm" 
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold px-4 rounded-lg"
                >
                  Add Topic to List
                </Button>
              </div>

              {/* Added topics list with confidence ratings */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topics & Initial Confidence</h3>
                {topics.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No topics added yet. Add some above or use templates.</p>
                ) : (
                  <div className="space-y-3">
                    {topics.map((t, idx) => (
                      <div key={idx} className="p-4 border border-slate-800 rounded-2xl space-y-3.5 bg-slate-950/20">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-bold text-sm text-slate-200">{t.name}</h5>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                              Weightage: {t.weightage}% | Est. Hours: {t.estimatedHours} hrs
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-lg flex items-center gap-1 text-xs"
                            onClick={() => handleRemoveTopic(idx)}
                          >
                            <Trash className="w-3.5 h-3.5" /> Remove
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-slate-400 font-semibold">
                            <span>How well do you know this topic right now?</span>
                            <span className="text-indigo-400 font-bold">{t.confidence}/10</span>
                          </div>
                          <Slider
                            defaultValue={[t.confidence]}
                            max={10}
                            step={1}
                            onValueChange={(val) => handleConfidenceChange(idx, val[0])}
                            className="py-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8 border-t border-slate-800 pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setMode('options')}
                  className="border-slate-800 bg-slate-900/20 hover:bg-slate-800/60 text-slate-300 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSaveSyllabus}
                  disabled={topics.length === 0 || saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-12 rounded-xl transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating plan...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 animate-spin-slow" /> Generate Plan & Dashboard
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SyllabusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="text-slate-400 text-sm">Loading syllabus builder...</div>
      </div>
    }>
      <SyllabusPageContent />
    </Suspense>
  )
}
