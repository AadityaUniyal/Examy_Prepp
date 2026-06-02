'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Check, RotateCcw, HelpCircle, Layers, BookmarkCheck, BrainCircuit, BarChart2, TrendingUp, AlertTriangle } from 'lucide-react'
import { fetchWithAuth } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const GET_FLASHCARD_STATS = gql`
  query GetFlashcardStats($examId: ID!) {
    flashcardStats(examId: $examId) {
      totalCards
      masteredTopics
      learningTopics
      notStartedTopics
      averageEaseFactor
      overdueCount
    }
  }
`

const GET_EXAMS_AND_TOPICS = gql`
  query GetExamsAndTopics {
    myExams {
      id
      name
      topics {
        id
        name
      }
    }
  }
`

const GET_FLASHCARDS = gql`
  query GetFlashcards($topicId: ID!) {
    myFlashcards(topicId: $topicId) {
      id
      question
      answer
    }
  }
`

const GENERATE_FLASHCARDS = gql`
  mutation GenerateFlashcards($topicId: ID!) {
    generateFlashcards(topicId: $topicId) {
      id
      question
      answer
    }
  }
`

const REVIEW_FLASHCARD = gql`
  mutation ReviewFlashcard($topicId: ID!, $isCorrect: Boolean!) {
    reviewFlashcard(topicId: $topicId, isCorrect: $isCorrect) {
      id
      nextReviewAt
      repetitionNum
    }
  }
`

interface Flashcard {
  id: string
  question: string
  answer: string
}

export default function FlashcardsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [selectedTopicName, setSelectedTopicName] = useState<string>('')
  const [deck, setDeck] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isFlipped, setIsFlipped] = useState<boolean>(false)
  const [completed, setCompleted] = useState<boolean>(false)
  const [generating, setGenerating] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'practice' | 'dashboard'>('practice')

  // Fetch topics
  const { data: topicsData, loading: topicsLoading } = useQuery(GET_EXAMS_AND_TOPICS, {
    skip: !session?.user
  })

  // Fetch flashcards when topic is selected
  const { data: cardData, loading: cardsLoading, refetch: refetchCards } = useQuery(GET_FLASHCARDS, {
    variables: { topicId: selectedTopicId },
    skip: !selectedTopicId
  })

  const examId = topicsData?.myExams?.[0]?.id

  // Fetch flashcard statistics
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery(GET_FLASHCARD_STATS, {
    variables: { examId },
    skip: !examId || activeTab !== 'dashboard',
    fetchPolicy: 'cache-and-network'
  })

  useEffect(() => {
    if (cardData?.myFlashcards) {
      setDeck(cardData.myFlashcards)
      setCurrentIndex(0)
      setIsFlipped(false)
      setCompleted(false)
    }
  }, [cardData])

  // Generate cards mutation
  const [generateFlashcards] = useMutation(GENERATE_FLASHCARDS, {
    onCompleted: (data) => {
      if (data?.generateFlashcards) {
        setDeck(data.generateFlashcards)
        setCurrentIndex(0)
        setIsFlipped(false)
        setCompleted(false)
      }
      setGenerating(false)
    },
    onError: () => {
      setGenerating(false)
    }
  })

  // Review card mutation
  const [reviewFlashcard] = useMutation(REVIEW_FLASHCARD)

  const handleGenerate = async () => {
    if (!selectedTopicId) return
    setGenerating(true)
    try {
      await generateFlashcards({
        variables: { topicId: selectedTopicId }
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleAnswer = async (isCorrect: boolean) => {
    // Send Leitner/SM2 update in background
    try {
      await reviewFlashcard({
        variables: {
          topicId: selectedTopicId,
          isCorrect
        }
      })
    } catch (e) {
      console.error(e)
    }

    // Go to next card
    setIsFlipped(false)
    setTimeout(() => {
      if (currentIndex < deck.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setCompleted(true)
      }
    }, 200)
  }

  const allTopics = topicsData?.myExams?.flatMap((e: any) => e.topics) || []

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-start p-4 md:p-8 relative overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full space-y-6 z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
              <Layers className="w-3.5 h-3.5" /> Spaced Repetition Engine
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Adaptive Flashcards
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              AI-generated cards calibrated via SM2 intervals for ultra-fast active recall
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

        {/* Toggle tabs for flashcards/dashboard */}
        <div className="flex bg-slate-900/60 backdrop-blur-xl border border-slate-900/80 p-1.5 rounded-2xl w-fit">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('practice')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'practice'
                ? 'bg-indigo-650 text-white hover:bg-indigo-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-transparent'
            }`}
          >
            Spaced Practice
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setActiveTab('dashboard')
              if (examId) refetchStats()
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-650 text-white hover:bg-indigo-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-transparent'
            }`}
          >
            SM2 Analytics Dashboard
          </Button>
        </div>

        {activeTab === 'dashboard' ? (
          statsLoading ? (
            <div className="text-center py-20 text-slate-500 animate-pulse font-bold tracking-widest text-xs uppercase">
              Analyzing Spaced Repetition Intervals...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Top-Level Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="bg-slate-900/40 border-slate-800/80 p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500"></div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Flashcards</span>
                  <div className="text-3xl font-black text-white mt-2">
                    {statsData?.flashcardStats?.totalCards || 0}
                  </div>
                  <p className="text-[10px] text-indigo-400 mt-1 font-medium">Active recall items</p>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800/80 p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500"></div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg Ease Factor</span>
                  <div className="text-3xl font-black text-emerald-400 mt-2">
                    {(statsData?.flashcardStats?.averageEaseFactor || 2.5).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-550 mt-1">SM2 memory coefficient</p>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800/80 p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500"></div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Overdue Reviews</span>
                  <div className={`text-3xl font-black mt-2 ${
                    (statsData?.flashcardStats?.overdueCount || 0) > 0 ? 'text-rose-450 animate-pulse' : 'text-slate-400'
                  }`}>
                    {statsData?.flashcardStats?.overdueCount || 0}
                  </div>
                  <p className="text-[10px] text-slate-550 mt-1">Require immediate practice</p>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800/80 p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-sky-500"></div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mastered Topics</span>
                  <div className="text-3xl font-black text-sky-400 mt-2">
                    {statsData?.flashcardStats?.masteredTopics || 0}
                  </div>
                  <p className="text-[10px] text-slate-550 mt-1">Interval hours &gt; 24h</p>
                </Card>
              </div>

              {/* PieChart Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900/40 border-slate-850 p-6 md:col-span-2 flex flex-col justify-between">
                  <CardHeader className="p-0">
                    <CardTitle className="text-base font-extrabold text-white">Spaced Learning Progression</CardTitle>
                    <CardDescription className="text-slate-500 text-xs">Breakdown of syllabus topics currently in spaced queues</CardDescription>
                  </CardHeader>
                  <div className="h-64 w-full flex items-center justify-center pt-4">
                    {(!statsData?.flashcardStats?.masteredTopics && !statsData?.flashcardStats?.learningTopics && !statsData?.flashcardStats?.notStartedTopics) ? (
                      <div className="text-slate-500 text-xs italic">No statistics logged. Start reviewing cards to generate charts.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Mastered', value: statsData.flashcardStats.masteredTopics, color: '#38bdf8' },
                              { name: 'Learning', value: statsData.flashcardStats.learningTopics, color: '#6366f1' },
                              { name: 'Not Started', value: statsData.flashcardStats.notStartedTopics, color: '#334155' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[
                              { color: '#38bdf8' },
                              { color: '#6366f1' },
                              { color: '#334155' }
                            ].map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                <Card className="bg-gradient-to-b from-slate-900/50 to-indigo-950/10 border border-slate-850 p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" /> Retention Insight
                    </h3>
                    <div className="space-y-3.5 pt-2">
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Memory Status</span>
                        <p className="text-xs text-slate-350 mt-1 leading-relaxed">
                          {(statsData?.flashcardStats?.overdueCount || 0) > 0 
                            ? '⚠️ Attention: Overdue reviews detected. Answer green on reviews to push intervals further.'
                            : '✅ Active recall targets achieved! All spaced flashcard reviews are up to date.'}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">SM2 Calibration</span>
                        <p className="text-xs text-slate-350 mt-1 leading-relaxed">
                          Your average ease factor of **{(statsData?.flashcardStats?.averageEaseFactor || 2.5).toFixed(2)}** shows structured recall intervals.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab('practice')}
                    className="w-full mt-6 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs"
                  >
                    Start Practice Deck
                  </Button>
                </Card>
              </div>
            </div>
          )
        ) : (
          <>
            {/* Topic Selector Widget */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-900/80 flex flex-col sm:flex-row gap-4 items-center justify-between">

          <div className="text-left w-full sm:w-auto">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Study Subject
            </label>
            {topicsLoading ? (
              <span className="text-sm text-slate-400 animate-pulse">Loading syllabus...</span>
            ) : (
              <select
                value={selectedTopicId}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedTopicId(val)
                  const t = allTopics.find((x: any) => x.id === val)
                  setSelectedTopicName(t ? t.name : '')
                  setDeck([])
                  setCompleted(false)
                }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-72"
              >
                <option value="">-- Choose a Topic --</option>
                {allTopics.map((topic: any) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedTopicId && deck.length > 0 && (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              variant="outline"
              className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-650/10 flex items-center gap-2 w-full sm:w-auto rounded-xl self-end sm:self-center"
            >
              <Sparkles className="w-4 h-4" /> Regenerate cards with AI
            </Button>
          )}
        </div>

        {/* Main interactive state space */}
        {!selectedTopicId ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-800/80 rounded-3xl bg-slate-900/10">
            <BrainCircuit className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="font-extrabold text-slate-450 text-lg">No Deck Loaded</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Please choose a syllabus topic from the dropdown selection above to start generating practice flashcards.
            </p>
          </div>
        ) : generating ? (
          <div className="py-28 text-center border border-slate-900/60 rounded-3xl bg-slate-900/10 space-y-4">
            <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h4 className="font-extrabold text-white text-md tracking-wide">Gemini generating flashcards...</h4>
            <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
              We are analyzing the subtopics for **{selectedTopicName}** and creating active recall cards.
            </p>
          </div>
        ) : deck.length === 0 ? (
          <div className="py-20 text-center border border-slate-900/60 rounded-3xl bg-slate-900/10 space-y-5">
            <HelpCircle className="w-12 h-12 text-indigo-400/40 mx-auto" />
            <div>
              <h3 className="font-bold text-white text-lg">No Active Flashcards</h3>
              <p className="text-slate-500 text-xs mt-1">
                You haven't generated a review deck for **{selectedTopicName}** yet.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 h-12 rounded-xl transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" /> Generate AI Flashcards
            </Button>
          </div>
        ) : completed ? (
          <div className="py-16 text-center border border-slate-900/60 rounded-3xl bg-slate-900/15 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400"></div>
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 animate-pulse">
              <BookmarkCheck className="w-8 h-8" />
            </div>
            <h3 className="font-black text-white text-2xl tracking-tight mb-2">Deck Fully Reviewed!</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Outstanding! You reviewed all {deck.length} flashcards for **{selectedTopicName}**. The SM2 spaced engine has rescheduled these items.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => {
                  setCurrentIndex(0)
                  setCompleted(false)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-5"
              >
                Restart Session
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="border-slate-800 text-slate-300 hover:bg-slate-900 h-11 px-5"
              >
                Return to Home
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Card counter */}
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Current Subject: {selectedTopicName}</span>
              <span>Card {currentIndex + 1} of {deck.length}</span>
            </div>

            {/* 3D Flip Flashcard viewport */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="h-80 w-full cursor-pointer relative select-none perspective group"
            >
              <div 
                className={`w-full h-full duration-500 transform-style-3d relative rounded-3xl shadow-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-2xl flex items-center justify-center p-8 transition-transform ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Side: Question */}
                <div className="absolute inset-0 backface-hidden flex flex-col justify-between p-8 text-center bg-slate-900/30 rounded-3xl">
                  <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Question (Click to reveal answer)</div>
                  <div className="text-lg md:text-xl font-extrabold text-white max-w-xl mx-auto px-4 self-center leading-relaxed">
                    {deck[currentIndex].question}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Click Card to Flip 🔄</div>
                </div>

                {/* Back Side: Answer */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-between p-8 text-center bg-indigo-950/20 rounded-3xl">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Answer Explanation</div>
                  <div className="text-sm md:text-base font-semibold text-slate-200 max-w-xl mx-auto px-4 self-center leading-relaxed whitespace-pre-wrap">
                    {deck[currentIndex].answer}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Click Card to Flip 🔄</div>
                </div>
              </div>
            </div>

            {/* Leitner rating buttons */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
              <Button
                onClick={() => handleAnswer(false)}
                className="h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-sm transition-transform active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-lg shadow-red-500/5"
              >
                <RotateCcw className="w-4 h-4" /> Review Again (SM2 Red)
              </Button>
              <Button
                onClick={() => handleAnswer(true)}
                className="h-14 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-sm transition-transform active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/5"
              >
                <Check className="w-4 h-4" /> Got It! (SM2 Green)
              </Button>
            </div>
            </div>
          )}
        </>
      )}
    </div>
      
      {/* 3D Perspective CSS Injection */}
      <style jsx global>{`
        .perspective {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}
