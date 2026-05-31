import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface Question {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

interface QuizEngineProps {
  topicName: string
  questions: Question[]
  onSubmitQuiz: (scorePercent: number) => void
}

export default function QuizEngine({ topicName, questions, onSubmitQuiz }: QuizEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [finished, setFinished] = useState(false)

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Loading quiz questions...
      </div>
    )
  }

  const currentQuestion = questions[currentIdx]

  const handleSelectOption = (idx: number) => {
    if (selectedIdx !== null) return // Already answered
    setSelectedIdx(idx)
    setShowExplanation(true)
    if (idx === currentQuestion.answerIndex) {
      setCorrectAnswersCount((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    setSelectedIdx(null)
    setShowExplanation(false)
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1)
    } else {
      setFinished(true)
    }
  }

  const handleFinish = () => {
    const finalScore = (correctAnswersCount / questions.length) * 100
    onSubmitQuiz(finalScore)
  }

  if (finished) {
    const percent = Math.round((correctAnswersCount / questions.length) * 100)
    return (
      <Card className="max-w-xl mx-auto shadow-xl border-slate-100 bg-white">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-indigo-900">Quiz Completed! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 text-center">
          <div className="py-6">
            <span className="text-6xl font-extrabold text-indigo-600 block">
              {percent}%
            </span>
            <span className="text-sm font-medium text-slate-500 mt-2 block">
              You got {correctAnswersCount} out of {questions.length} questions correct
            </span>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-md font-semibold text-white"
          >
            Submit Score & Update Confidence
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-xl border-indigo-100 bg-white">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between text-indigo-900">
          <span>Quiz on: {topicName}</span>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">
            Q: {currentIdx + 1}/{questions.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-900 leading-snug">
          {currentQuestion.question}
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx
            const isCorrect = currentQuestion.answerIndex === idx
            let btnClass = 'w-full text-left justify-start h-auto py-3 px-4 text-sm font-medium border-slate-200 hover:bg-slate-50 hover:text-indigo-900 transition-all'

            if (selectedIdx !== null) {
              if (isCorrect) {
                btnClass = 'w-full text-left justify-start h-auto py-3 px-4 text-sm font-medium bg-green-50 text-green-800 border-green-300 pointer-events-none'
              } else if (isSelected) {
                btnClass = 'w-full text-left justify-start h-auto py-3 px-4 text-sm font-medium bg-rose-50 text-rose-800 border-rose-300 pointer-events-none'
              } else {
                btnClass = 'w-full text-left justify-start h-auto py-3 px-4 text-sm font-medium text-slate-400 border-slate-100 pointer-events-none'
              }
            }

            return (
              <Button
                key={idx}
                variant="outline"
                className={btnClass}
                onClick={() => handleSelectOption(idx)}
              >
                <div className="flex gap-3">
                  <span className="font-bold opacity-60">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span>{opt}</span>
                </div>
              </Button>
            )
          })}
        </div>

        {showExplanation && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 space-y-2 animate-fade-in">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              Explanation:
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {selectedIdx !== null && (
          <Button
            onClick={handleNext}
            className="w-full h-11 bg-slate-950 hover:bg-slate-900 text-white font-medium"
          >
            {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
