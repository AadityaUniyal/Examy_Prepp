'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarRange, BookOpen, GraduationCap } from 'lucide-react'

interface OnboardingWizardProps {
  onComplete: (data: { examName: string; examDate: string; board: string; topics: string[] }) => void
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [board, setBoard] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState('')

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      onComplete({ examName, examDate, board, topics })
    }
  }

  const handleAddTopic = () => {
    const trimmed = topicInput.trim()
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed])
      setTopicInput('')
    }
  }

  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index))
  }

  return (
    <Card className="max-w-md w-full mx-auto p-6 bg-[rgb(var(--surface-0))] border-slate-200 text-white rounded-2xl shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-indigo-400">Exam Setup Wizard</h3>
        <span className="text-xs text-slate-500 font-bold font-mono">Step {step} / 3</span>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-indigo-600/15 rounded-xl w-fit mb-2">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
          </div>
          <h4 className="font-extrabold text-lg text-white">Name your Exam</h4>
          <p className="text-xs text-[rgb(var(--text-muted))]">Specify the subject or exam title alongside the academic board details.</p>
          <Input
            placeholder="Exam Name (e.g. Physics Final)"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="bg-transparent border-slate-200 text-white h-11"
          />
          <Input
            placeholder="Board Name (e.g. CBSE, IB)"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            className="bg-transparent border-slate-200 text-white h-11"
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-indigo-600/15 rounded-xl w-fit mb-2">
            <CalendarRange className="w-6 h-6 text-indigo-400" />
          </div>
          <h4 className="font-extrabold text-lg text-white">Select Exam Date</h4>
          <p className="text-xs text-[rgb(var(--text-muted))]">This helps us schedule your study blocks and optimize review time pressure.</p>
          <Input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="bg-transparent border-slate-200 text-white h-11"
          />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-indigo-600/15 rounded-xl w-fit mb-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <h4 className="font-extrabold text-lg text-white">Add Exam Topics</h4>
          <p className="text-xs text-[rgb(var(--text-muted))]">Enter the topics you need to cover for this syllabus.</p>
          <div className="flex gap-2">
            <Input
              placeholder="Topic name (e.g. Thermodynamics)"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="bg-transparent border-slate-200 text-white h-11"
            />
            <Button onClick={handleAddTopic} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-4 font-bold">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
            {topics.map((t, idx) => (
              <span key={idx} className="bg-slate-800 border border-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold">
                {t}
                <button onClick={() => handleRemoveTopic(idx)} className="text-red-400 hover:text-red-500 font-extrabold">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-200/80">
        <Button
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
          className="bg-transparent border border-slate-200 text-[rgb(var(--text-muted))] hover:bg-slate-100"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={step === 1 ? !examName || !board : step === 2 ? !examDate : topics.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 font-bold"
        >
          {step === 3 ? 'Complete Setup' : 'Next'}
        </Button>
      </div>
    </Card>
  )
}
