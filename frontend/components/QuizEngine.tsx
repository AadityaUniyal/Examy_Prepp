import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ChevronRight, AlertCircle, HelpCircle, Award } from 'lucide-react'

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
      <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">
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
      <Card className="max-w-xl mx-auto shadow-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-2xl rounded-3xl overflow-hidden relative p-8 text-center space-y-6">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>
        
        <div className="mx-auto h-20 w-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
          <Award className="w-10 h-10" />
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-black bg-gradient-to-b from-white to-slate-350 bg-clip-text text-transparent">
            Quiz Completed! 🎉
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-0">
          <div className="py-4">
            <span className="text-6xl font-black text-indigo-400 block tracking-tight">
              {percent}%
            </span>
            <span className="text-xs font-bold text-slate-500 mt-3 block uppercase tracking-wider">
              You scored {correctAnswersCount} / {questions.length} correct
            </span>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            Submit Score & Update Confidence
          </Button>
        </CardContent>
      </Card>
    )
  }

  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100)

  return (
    <Card className="max-w-2xl mx-auto shadow-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-2xl rounded-3xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>
      
      {/* Progress timeline bar */}
      <div className="absolute top-[2px] left-0 right-0 h-1 bg-slate-950">
        <div 
          className="bg-indigo-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <CardHeader className="border-b border-slate-850 bg-slate-950/20 py-4 pt-6">
        <CardTitle className="text-xs font-bold flex items-center justify-between text-slate-400">
          <span className="truncate max-w-[400px] uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-400" /> Quiz: {topicName}
          </span>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-extrabold">
            Q: {currentIdx + 1}/{questions.length}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        <h3 className="text-base font-bold text-white leading-relaxed tracking-tight">
          {currentQuestion.question}
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx
            const isCorrect = currentQuestion.answerIndex === idx
            
            let btnClass = 'w-full text-left justify-start h-auto py-3.5 px-4 text-sm font-semibold border-slate-850 bg-slate-950/30 text-slate-350 hover:bg-slate-800/40 hover:text-white transition-all rounded-xl duration-150 active:scale-[0.99] border flex items-center gap-3'

            if (selectedIdx !== null) {
              if (isCorrect) {
                btnClass = 'w-full text-left justify-start h-auto py-3.5 px-4 text-sm font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/25 pointer-events-none rounded-xl border flex items-center gap-3'
              } else if (isSelected) {
                btnClass = 'w-full text-left justify-start h-auto py-3.5 px-4 text-sm font-bold bg-rose-500/10 text-rose-450 border-rose-500/25 pointer-events-none rounded-xl border flex items-center gap-3'
              } else {
                btnClass = 'w-full text-left justify-start h-auto py-3.5 px-4 text-sm font-medium text-slate-700 border-slate-900 pointer-events-none rounded-xl border flex items-center gap-3'
              }
            }

            return (
              <button
                key={idx}
                className={btnClass}
                onClick={() => handleSelectOption(idx)}
                disabled={selectedIdx !== null}
              >
                <span className="font-extrabold text-[11px] opacity-40 bg-slate-950 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border border-slate-850">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>

        {showExplanation && (
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Explanation
            </span>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {selectedIdx !== null && (
          <Button
            onClick={handleNext}
            className="w-full h-12 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-xl transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
          >
            {currentIdx < questions.length - 1 ? (
              <>
                Next Question <ChevronRight className="w-4 h-4 text-slate-950" />
              </>
            ) : (
              'Finish Quiz'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
