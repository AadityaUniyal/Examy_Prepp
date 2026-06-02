'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWithAuth } from '@/lib/utils'
import { Sparkles, Calendar, BookOpen, Clock, Target, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    examName: '',
    examDate: '',
    board: 'CBSE',
    hoursPerDay: '4',
  })
  const [submitting, setSubmitting] = useState(false)

  const commonExams = [
    { label: 'CBSE Class 12', value: 'CBSE' },
    { label: 'JEE Main', value: 'JEE_MAIN' },
    { label: 'NEET', value: 'NEET' },
    { label: 'ISC', value: 'ISC' },
    { label: 'Custom Board / University', value: 'CUSTOM' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.examName.trim() || !formData.examDate) {
      alert('Please fill out the exam name and select a date.')
      return
    }
    setSubmitting(true)

    try {
      const response = await fetchWithAuth('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation CreateExam($name: String!, $examDate: String!, $board: String!) {
            createExam(name: $name, examDate: $examDate, board: $board) {
              id
              name
            }
          }`,
          variables: {
            name: formData.examName,
            examDate: formData.examDate,
            board: formData.board
          }
        })
      })

      const result = await response.json()
      if (result.data?.createExam?.id) {
        router.push(`/onboarding/syllabus?examId=${result.data.createExam.id}`)
      } else {
        alert('Failed to initialize exam configuration. Please try again.')
      }
    } catch (err) {
      console.error(err)
      alert('Network error during onboarding setup.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] right-[-10%] bottom-[-10%] pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[15%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
            <span className="font-extrabold text-white text-2xl tracking-tighter">E</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Let's Customize Your Sprint
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Configure your exam timeline. Our algorithm allocates active-recall blocks based on your time availability.
          </p>
        </div>

        {/* Premium Dark Onboarding Card */}
        <Card className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          {/* Top border glowing gradient */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-4">
              {/* Exam Name */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" /> Exam Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., AP Biology Midterm, Final Physics Exam"
                  value={formData.examName}
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                  required
                />
              </div>

              {/* Exam Date */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" /> Exam Target Date
                </label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                  required
                />
              </div>

              {/* Board Selection & Hours in a Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Board/System
                  </label>
                  <select
                    value={formData.board}
                    onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                  >
                    {commonExams.map(exam => (
                      <option key={exam.value} value={exam.value} className="bg-slate-950 text-slate-200">
                        {exam.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Study Budget (Hrs/Day)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.hoursPerDay}
                    onChange={(e) => setFormData({ ...formData, hoursPerDay: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Smart info badge */}
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-xs leading-relaxed">
              <Sparkles className="w-4 h-4 shrink-0 text-sky-400" />
              <span>We recommend allocating 4+ hours daily for sprint prep to guarantee complete syllabus coverage.</span>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-13 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {submitting ? 'Initializing Prep Modules...' : 'Continue to Syllabus Setup'} 
                <ArrowRight className="w-4 h-4 text-white" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
