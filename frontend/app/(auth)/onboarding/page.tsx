'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    examName: '',
    examDate: '',
    board: 'CBSE',
    hoursPerDay: '2',
  })

  const commonExams = [
    { label: 'CBSE Class 12', value: 'CBSE' },
    { label: 'JEE Main', value: 'JEE_MAIN' },
    { label: 'NEET', value: 'NEET' },
    { label: 'ISC', value: 'ISC' },
    { label: 'Custom', value: 'CUSTOM' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation CreateExam($name: String!, $examDate: String!, $board: String!) {
          createExam(name: $name, examDate: $examDate, board: $board) {
            id
            name
          }
        }`,
        variables: formData
      })
    })

    const result = await response.json()
    if (result.data?.createExam?.id) {
      router.push(`/onboarding/syllabus?examId=${result.data.createExam.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Setup Your Exam</CardTitle>
          <CardDescription>Step {step} of 4</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Exam Name</label>
                <Input
                  placeholder="e.g., Biology Final Exam"
                  value={formData.examName}
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Exam Date</label>
                <Input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Board/University</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.board}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                >
                  {commonExams.map(exam => (
                    <option key={exam.value} value={exam.value}>{exam.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hours Available Per Day</label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.hoursPerDay}
                  onChange={(e) => setFormData({ ...formData, hoursPerDay: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                if (step < 4) setStep(step + 1)
                else handleSubmit({ preventDefault: () => {} } as any)
              }}
            >
              {step === 4 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
