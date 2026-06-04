'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchWithAuth } from '@/lib/utils'
import { ArrowLeft, Sparkles, Award, Timer, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react'

interface Question {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  topicId: string
}

interface GradeResult {
  score: number
  feedback: string
  questionsCorrect: number
  totalQuestions: number
}

export default function MockExamPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [examId, setExamId] = useState<string>('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [grading, setGrading] = useState<boolean>(false)
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(300) // 5 minutes limit
  const [examStarted, setExamStarted] = useState<boolean>(false)

  // Fetch examId
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await fetchWithAuth('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query {
              myExams {
                id
              }
            }`
          })
        })
        const result = await response.json()
        if (result.data?.myExams?.[0]) {
          setExamId(result.data.myExams[0].id)
        }
      } catch (e) {
        console.error(e)
      }
    }
    if (session?.user) {
      fetchExam()
    }
  }, [session])

  // Timer countdown
  useEffect(() => {
    if (!examStarted || gradeResult) return
    if (timeLeft <= 0) {
      handleAutoSubmit()
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [examStarted, timeLeft, gradeResult])

  const handleStartExam = async () => {
    if (!examId) return
    setLoading(true)
    try {
      const response = await fetchWithAuth('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation GenerateMockExam($examId: ID!) {
            generateMockExam(examId: $examId) {
              id
              question
              options
              correctIndex
              explanation
              topicId
            }
          }`,
          variables: { examId }
        })
      })
      const result = await response.json()
      if (result.data?.generateMockExam) {
        setQuestions(result.data.generateMockExam)
        setSelectedAnswers({})
        setGradeResult(null)
        setTimeLeft(300)
        setExamStarted(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOption = (qIdx: number, oIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: oIdx
    }))
  }

  const handleSubmitExam = async () => {
    if (questions.length === 0) return
    
    // Validate that all questions are answered
    if (Object.keys(selectedAnswers).length < questions.length) {
      alert("Please answer all questions before submitting.")
      return
    }

    submitGrade()
  }

  const handleAutoSubmit = () => {
    alert("Time has expired! Submitting your answers automatically.")
    submitGrade()
  }

  const submitGrade = async () => {
    setGrading(true)
    try {
      const answersArray = questions.map((_, idx) => 
        selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1
      )
      const questionsJson = JSON.stringify(questions)

      const response = await fetchWithAuth('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation GradeMockExam($examId: ID!, $answers: [Int!]!, $questionsJson: String!) {
            gradeMockExam(examId: $examId, answers: $answers, questionsJson: $questionsJson) {
              score
              feedback
              questionsCorrect
              totalQuestions
            }
          }`,
          variables: {
            examId,
            answers: answersArray,
            questionsJson
          }
        })
      })
      const result = await response.json()
      if (result.data?.gradeMockExam) {
        setGradeResult(result.data.gradeMockExam)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGrading(false)
    }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-6 z-10 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Weakness Calibration Hub
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              AI Mock Exam
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Personalized mock exams targeting weakest syllabus subjects to feed model calibration loops.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')} 
            className="border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 text-slate-300 flex items-center gap-2 self-start md:self-auto rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>

        {/* Start / Intro State */}
        {!examStarted && (
          <Card className="bg-slate-900/30 border border-slate-900 p-8 text-center space-y-6 max-w-2xl mx-auto">
            <Award className="w-16 h-16 text-indigo-400 mx-auto animate-pulse" />
            <div>
              <h2 className="text-2xl font-extrabold text-white">Generate Mock Assessment</h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                ExamEve will scan your topic confidence logs, identify your lowest mastery subjects, and request a 5-question multiple choice test from Gemini. Results will feed retraining databases.
              </p>
            </div>

            <Button
              onClick={handleStartExam}
              disabled={loading || !examId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Exam...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Start AI Mock Exam
                </>
              )}
            </Button>
          </Card>
        )}

        {/* Running Exam state */}
        {examStarted && !gradeResult && (
          <div className="space-y-6">
            {/* Countdown / Stats bar */}
            <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
              <div className="flex items-center gap-2 font-bold text-slate-350 text-xs">
                <span>Subject Assessment (5 Questions)</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-1.5 border border-slate-800 rounded-xl font-bold text-xs">
                <Timer className={`w-4 h-4 ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`} />
                <span className={timeLeft < 60 ? 'text-rose-450' : 'text-slate-300'}>
                  Time Remaining: {formatTimer(timeLeft)}
                </span>
              </div>
            </div>

            {/* Questions list */}
            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <Card key={q.id} className="bg-slate-900/30 border border-slate-900/60 p-6 space-y-4">
                  <h4 className="text-base font-bold text-slate-100 flex items-start gap-2.5">
                    <span className="text-indigo-400 text-sm font-black mt-0.5">0{qIdx + 1}.</span>
                    <span>{q.question}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[qIdx] === oIdx
                      return (
                        <div
                          key={oIdx}
                          onClick={() => handleSelectOption(qIdx, oIdx)}
                          className={`p-4 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-bold'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/80 hover:text-slate-200'
                          }`}
                        >
                          <span className="mr-2 font-black uppercase text-indigo-400">{String.fromCharCode(65 + oIdx)}.</span>
                          {opt}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>

            {/* Submission Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("Are you sure you want to quit? Answers will not be saved.")) {
                    setExamStarted(false)
                  }
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                Quit Assessment
              </Button>
              <Button
                onClick={handleSubmitExam}
                disabled={grading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/10"
              >
                {grading ? 'Grading answers...' : 'Submit Answers'}
              </Button>
            </div>
          </div>
        )}

        {/* Grade Results state */}
        {gradeResult && (
          <div className="space-y-6">
            {/* Score Summary panel */}
            <Card className="bg-slate-900/30 border border-slate-900 p-8 text-center space-y-6">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>
              
              <div className="mx-auto h-20 w-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-bounce">
                <ShieldCheck className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white">Assessment Graded!</h2>
                <div className={`text-4xl font-black ${
                  gradeResult.score >= 70 ? 'text-emerald-400' : 'text-indigo-400'
                }`}>
                  {gradeResult.score.toFixed(0)}% Score
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Correct answers: {gradeResult.questionsCorrect} / {gradeResult.totalQuestions}
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl max-w-md mx-auto text-xs leading-relaxed text-slate-300">
                {gradeResult.feedback}
              </div>

              <div className="flex justify-center gap-3.5 pt-4">
                <Button
                  onClick={handleStartExam}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6"
                >
                  Retake New Mock
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-slate-800 bg-slate-900/40 text-slate-350 hover:bg-slate-900 rounded-xl h-11 px-6"
                >
                  Dashboard
                </Button>
              </div>
            </Card>

            {/* Question explanation list */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Question Explanations</h3>
              {questions.map((q, idx) => {
                const userAns = selectedAnswers[idx]
                const isCorrect = userAns === q.correctIndex
                return (
                  <Card key={q.id} className="bg-slate-900/20 border border-slate-900 p-5 space-y-3">
                    <div className="flex justify-between items-start gap-2.5">
                      <h4 className="text-sm font-bold text-white leading-relaxed">
                        0{idx + 1}. {q.question}
                      </h4>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md border shrink-0 ${
                        isCorrect ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                      }`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                      <div className={`p-3 rounded-lg border ${
                        isCorrect ? 'bg-emerald-950/5 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/5 border-rose-900/40 text-rose-400'
                      }`}>
                        <span className="font-bold block uppercase text-[9px] tracking-wider mb-0.5">Your Choice</span>
                        {q.options[userAns] || 'Unanswered'}
                      </div>
                      {!isCorrect && (
                        <div className="p-3 bg-emerald-950/5 border border-emerald-900/40 text-emerald-400 rounded-lg">
                          <span className="font-bold block uppercase text-[9px] tracking-wider mb-0.5">Correct Answer</span>
                          {q.options[q.correctIndex]}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/60 text-xs leading-relaxed text-slate-400">
                      <span className="font-bold text-slate-300 block mb-0.5">Explanation</span>
                      {q.explanation}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
