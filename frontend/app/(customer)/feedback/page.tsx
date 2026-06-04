'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useMutation, gql } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, MessageSquare, Star, Sparkles, Send, ArrowLeft, Bug, Lightbulb, HeartHandshake } from 'lucide-react'

const SUBMIT_FEEDBACK = gql`
  mutation SubmitFeedback($rating: Int!, $feedbackType: String!, $message: String!) {
    submitFeedback(rating: $rating, feedbackType: $feedbackType, message: $message)
  }
`

type FeedbackType = 'BUG' | 'FEATURE' | 'GENERAL'

export default function FeedbackPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('GENERAL')
  const [message, setMessage] = useState<string>('')
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const [submitFeedback, { loading }] = useMutation(SUBMIT_FEEDBACK, {
    onCompleted: (data) => {
      if (data?.submitFeedback) {
        setSubmitted(true)
      } else {
        setErrorMsg('Failed to process feedback. Please try again.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'An error occurred while submitting feedback.')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (rating === 0) {
      setErrorMsg('Please select a star rating.')
      return
    }
    if (!message.trim()) {
      setErrorMsg('Please type your feedback message.')
      return
    }

    try {
      await submitFeedback({
        variables: {
          rating,
          feedbackType,
          message
        }
      })
    } catch (err) {
      // Handled by onError callback
    }
  }

  const ratingDescriptions = [
    '',
    'Need improvements',
    'Could be better',
    'Satisfactory & Decent',
    'Great experience',
    'Amazing, love it!'
  ]

  const categoryCards = [
    {
      type: 'BUG' as FeedbackType,
      title: 'Report a Bug',
      desc: 'Technical issues, visual glitches, or broken logic.',
      icon: Bug,
      color: 'from-rose-500/20 to-red-500/10 border-red-500/20 text-red-400 focus-ring:border-red-500'
    },
    {
      type: 'FEATURE' as FeedbackType,
      title: 'Request Feature',
      desc: 'Suggest improvements, tools, or smart additions.',
      icon: Lightbulb,
      color: 'from-amber-500/20 to-yellow-500/10 border-yellow-500/20 text-yellow-400 focus-ring:border-yellow-500'
    },
    {
      type: 'GENERAL' as FeedbackType,
      title: 'General Review',
      desc: 'Your thoughts, experiences, and overall impressions.',
      icon: HeartHandshake,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-400 focus-ring:border-emerald-500'
    }
  ]

  if (submitted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="absolute top-10 left-10">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')} 
            className="text-[rgb(var(--text-muted))] hover:text-slate-900 flex items-center gap-2 hover:bg-[rgb(var(--surface-0))]/50"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>
        
        {/* Glow Effects */}
        <div className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

        <Card className="w-full max-w-lg bg-[rgb(var(--surface-0))]/60 backdrop-blur-2xl border-slate-200/80 shadow-2xl relative overflow-hidden text-center p-8">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>
          
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 animate-pulse">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Feedback Submitted!
          </h2>
          <p className="text-[rgb(var(--text-muted))] text-sm max-w-md mx-auto mb-8">
            Thank you for helping us improve ExamEve. Your feedback has been sent directly to the development team at <span className="text-sky-400 font-semibold">aadityacheeks@gmail.com</span>.
          </p>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => {
                setSubmitted(false)
                setRating(0)
                setMessage('')
                setFeedbackType('GENERAL')
              }}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              Send Another Response
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              className="w-full h-12 border-slate-200 bg-[rgb(var(--surface-0))]/20 hover:bg-slate-100/60 text-[rgb(var(--text-secondary))] rounded-xl"
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-start p-4 md:p-8 relative">
      {/* Decorative Glows */}
      <div className="absolute top-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] rounded-full bg-sky-600/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full space-y-6 z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Direct Support Channel
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Share Your Feedback
            </h1>
            <p className="text-[rgb(var(--text-muted))] text-sm mt-1">
              Your feature requests, bug reports, and suggestions go directly to <span className="text-indigo-400 font-semibold">aadityacheeks@gmail.com</span>
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')} 
            className="border-slate-200 bg-[rgb(var(--surface-0))]/60 hover:bg-slate-100/80 text-[rgb(var(--text-secondary))] flex items-center gap-2 self-start md:self-auto rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata prefill display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[rgb(var(--surface-0))]/40 border border-slate-200/60">
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Feedback Author</span>
              <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">{session?.user?.name || 'Student'}</span>
            </div>
            <div className="p-4 rounded-xl bg-[rgb(var(--surface-0))]/40 border border-slate-200/60">
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Contact Address</span>
              <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">{session?.user?.email || 'student@exameve.com'}</span>
            </div>
          </div>

          {/* Step 1: Category Card Selector */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-[rgb(var(--text-primary))] tracking-wide">
              1. What kind of feedback are you submitting?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categoryCards.map((card) => {
                const Icon = card.icon
                const isSelected = feedbackType === card.type
                return (
                  <div
                    key={card.type}
                    onClick={() => setFeedbackType(card.type)}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between h-36 select-none ${
                      isSelected 
                        ? `bg-gradient-to-b ${card.color} border-current ring-1 ring-offset-2 ring-offset-slate-950 ring-indigo-500 scale-[1.02]` 
                        : 'bg-[rgb(var(--surface-0))]/20 border-slate-200/80 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-0))]/50 hover:border-slate-200/60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/10' : 'bg-slate-800/40 text-[rgb(var(--text-muted))]'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-current animate-ping"></span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{card.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 2: Interactive Star Selector */}
          <div className="space-y-3 p-6 rounded-2xl bg-[rgb(var(--surface-0))]/20 border border-slate-200/40">
            <label className="block text-sm font-bold text-[rgb(var(--text-primary))] tracking-wide">
              2. Rate your experience with ExamEve
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = starValue <= (hoveredRating || rating)
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(starValue)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star 
                        className={`w-9 h-9 transition-colors duration-200 ${
                          isFilled 
                            ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]' 
                            : 'text-slate-700 hover:text-slate-500'
                        }`} 
                      />
                    </button>
                  )
                })}
              </div>

              {/* Live Tag text for rating */}
              <div className="h-6 flex items-center">
                <span className="text-xs font-semibold text-[rgb(var(--text-muted))] bg-[rgb(var(--surface-0))]/50 px-3 py-1 rounded-full border border-slate-200/50 transition-opacity">
                  {ratingDescriptions[hoveredRating || rating] || 'Select stars'}
                </span>
              </div>
            </div>
          </div>

          {/* Step 3: Message Textarea */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <label className="block text-sm font-bold text-[rgb(var(--text-primary))] tracking-wide">
                3. Your message or suggestions
              </label>
              <span className={`text-[10px] font-bold tracking-wider uppercase ${message.length > 900 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
                {message.length} / 1000 characters
              </span>
            </div>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                placeholder={
                  feedbackType === 'BUG'
                    ? 'Please detail the steps to reproduce the issue, what happened, and what you expected...'
                    : feedbackType === 'FEATURE'
                    ? 'What capability would you like to see? Describe the value it adds for exam prep...'
                    : 'Write your thoughts, reviews, or queries here...'
                }
                rows={6}
                className="w-full bg-[rgb(var(--surface-0))]/40 border border-slate-200/80 rounded-2xl p-4 text-sm text-[rgb(var(--text-primary))] placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-all resize-none shadow-inner"
              />
              <div className="absolute right-3.5 bottom-3.5 text-slate-600 pointer-events-none">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading || rating === 0 || !message.trim()}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-base rounded-2xl transition-all shadow-xl hover:shadow-indigo-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Feedback...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Feedback to aadityacheeks@gmail.com
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
