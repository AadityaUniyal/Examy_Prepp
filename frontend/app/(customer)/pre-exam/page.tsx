'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PreExamPage() {
  const router = useRouter()
  const [breatheText, setBreatheText] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')
  const [timerCount, setTimerCount] = useState(4)

  const cheatSheetItems = [
    'Photosynthesis: Chlorophyll a (absorption peaks at 430nm & 660nm) initiates primary charge separation. Calvin Cycle requires 18 ATP and 12 NADPH for 1 Glucose molecule.',
    'Cell Division: Meiosis I is reductional (homologous pairs segregate); Meiosis II is equational (sister chromatids segregate). Crossing over occurs in Pachytene phase of Prophase I.',
    'Genetics: Monohybrid phenotypic ratio is 3:1 (genotypic 1:2:1). Dihybrid phenotypic ratio is 9:3:3:1. Codominance is seen in human ABO blood group inheritance.',
    'Ecology: 10% trophic transfer efficiency rule (Lindeman). Energy pyramid is always upright. Biomagnification increases toxin concentration up the food chain.'
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setTimerCount((c) => {
        if (c <= 1) {
          if (breatheText === 'Inhale') {
            setBreatheText('Hold')
            return 7
          } else if (breatheText === 'Hold') {
            setBreatheText('Exhale')
            return 8
          } else {
            setBreatheText('Inhale')
            return 4
          }
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [breatheText])

  return (
    <div className="min-h-screen bg-transparent text-[rgb(var(--text-primary))] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-cyan-400 tracking-tight">Pre-Exam Calming Mode</h1>
            <p className="text-[rgb(var(--text-muted))] mt-1">Last 60 minutes stabilizer & final cheat sheets</p>
          </div>
          <Button variant="outline" className="border-slate-200 hover:bg-[rgb(var(--surface-0))]" onClick={() => router.push('/dashboard')}>
            Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calming Breathing Stabilizer */}
          <Card className="md:col-span-1 bg-[rgb(var(--surface-0))] border-slate-200 text-white flex flex-col items-center justify-center p-6 text-center">
            <h3 className="font-bold text-lg mb-4 text-cyan-300">Nerve Stabilizer</h3>
            <div className="relative h-44 w-44 flex items-center justify-center rounded-full bg-slate-800 border-4 border-slate-200 shadow-2xl">
              <div
                className={`absolute inset-4 rounded-full transition-all duration-1000 ease-in-out opacity-20 ${
                  breatheText === 'Inhale' ? 'bg-cyan-500 scale-110' :
                  breatheText === 'Hold' ? 'bg-teal-500 scale-125' :
                  'bg-blue-500 scale-90'
                }`}
              />
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold tracking-wider text-[rgb(var(--text-primary))]">{breatheText}</span>
                <span className="text-3xl font-extrabold text-cyan-400 mt-1">{timerCount}</span>
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))] mt-4 leading-relaxed">
              Match your breathing with the stabilizer to reduce pre-exam heart rate and cortisol levels.
            </p>
          </Card>

          {/* AI Cheat Sheets */}
          <Card className="md:col-span-2 bg-[rgb(var(--surface-0))] border-slate-200 text-white">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-cyan-300">AI-Generated Revision Cheat Sheet</CardTitle>
              <CardDescription className="text-[rgb(var(--text-muted))]">High-yield concepts most likely to be forgotten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-slate-800 space-y-4">
                {cheatSheetItems.map((item, idx) => (
                  <div key={idx} className="pt-4 first:pt-0 flex gap-3">
                    <span className="text-cyan-400 font-extrabold text-lg">0{idx + 1}.</span>
                    <p className="text-[rgb(var(--text-secondary))] text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            className="w-full md:w-auto px-12 py-6 text-lg font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-lg"
            onClick={() => alert("Best of luck! You've got this. Take a deep breath and start.")}
          >
            👍 I'm Ready for my Exam
          </Button>
        </div>
      </div>
    </div>
  )
}
