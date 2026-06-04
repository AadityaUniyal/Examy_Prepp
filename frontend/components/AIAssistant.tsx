'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useMutation, gql } from '@apollo/client'
import { Sparkles, MessageSquare, X, Send, User, Bot, HelpCircle, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ASK_AI = gql`
  mutation AskAI($topicId: ID!, $message: String!, $chatHistory: JSON) {
    askAI(topicId: $topicId, message: $message, chatHistory: $chatHistory)
  }
`

interface AIAssistantProps {
  topicId: string
  topicName: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIAssistant({ topicId, topicName }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your ExamEve Study Buddy. I can explain complex terms, answer questions, or provide practice prompts for **${topicName}**. What would you like to cover?`
    }
  ])
  const [isELI5, setIsELI5] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [askAI, { loading }] = useMutation(ASK_AI, {
    onCompleted: (data) => {
      if (data?.askAI) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.askAI }])
      }
    },
    onError: (err) => {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}. Please try again.` }])
    }
  })

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    let finalMessage = input.trim()
    if (isELI5) {
      finalMessage = `[ELI5 Mode] Explain this like I am 5 years old: ${finalMessage}`
    }

    const newMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, newMsg])
    setInput('')

    // Slice history to last 6 messages to stay within token sizes
    const historyPayload = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      await askAI({
        variables: {
          topicId,
          message: finalMessage,
          chatHistory: historyPayload
        }
      })
    } catch (err) {
      // Handled by onError
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white shadow-xl shadow-indigo-500/20 flex items-center justify-center border border-indigo-400/20 transition-all hover:scale-110 active:scale-95 group relative"
        >
          <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border border-slate-950 rounded-full"></span>
        </Button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-80 md:w-96 h-[500px] bg-[rgb(var(--surface-0))]/90 backdrop-blur-2xl border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-5 duration-300">
          {/* Top Header */}
          <div className="p-4 bg-transparent/60 border-b border-slate-200/80 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Study Buddy AI</h3>
                <span className="block text-[10px] text-sky-400 font-medium">Topic: {topicName}</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[rgb(var(--text-muted))] hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Logs Window */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => {
              const isBot = msg.role === 'assistant'
              return (
                <div key={idx} className={`flex items-start gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
                  {isBot && (
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      isBot 
                        ? 'bg-slate-800/40 text-[rgb(var(--text-primary))] border border-slate-200/50 rounded-tl-none' 
                        : 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {!isBot && (
                    <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )
            })}
            
            {loading && (
              <div className="flex items-start gap-2.5 justify-start">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-800/40 border border-slate-200/50 rounded-2xl rounded-tl-none px-4 py-3 text-[rgb(var(--text-muted))] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Settings & Input */}
          <div className="p-4 bg-transparent/40 border-t border-slate-200 space-y-3">
            {/* ELI5 Toggle */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-indigo-400" /> Explain mode:
              </span>
              <button
                type="button"
                onClick={() => setIsELI5(!isELI5)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all border ${
                  isELI5 
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' 
                    : 'bg-[rgb(var(--surface-0))] border-slate-200 text-slate-500 hover:text-[rgb(var(--text-muted))]'
                }`}
              >
                {isELI5 ? 'Explain Like I\'m 5 👶' : 'Standard Tutor 🎓'}
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask study questions..."
                className="flex-1 bg-[rgb(var(--surface-0))] border border-slate-200 rounded-xl px-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-3.5 flex items-center justify-center shrink-0 transition-transform active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
