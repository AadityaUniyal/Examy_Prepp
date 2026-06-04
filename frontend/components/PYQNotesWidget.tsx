'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { fetchWithAuth } from '@/lib/utils'
import { UploadCloud, FileText, Sparkles, BookOpen, AlertCircle, CheckCircle, Search, HelpCircle } from 'lucide-react'

interface PYQNotesWidgetProps {
  examId: string
  topics: Array<{ id?: string; name: string }>
}

export default function PYQNotesWidget({ examId, topics }: PYQNotesWidgetProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [generatedNotes, setGeneratedNotes] = useState<string | null>(null)
  
  const [pyqFile, setPyqFile] = useState<File | null>(null)
  const [pyqLoading, setPyqLoading] = useState(false)
  const [generatedPyqs, setGeneratedPyqs] = useState<any[] | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleNotesGenerate = async () => {
    if (!selectedTopic) return
    setNotesLoading(true)
    setErrorMsg('')
    setGeneratedNotes(null)

    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, topicName: selectedTopic })
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedNotes(data.studyNote.content)
        setSuccessMsg('Notes generated successfully!')
      } else {
        setErrorMsg(data.error || 'Failed to generate study notes.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with notes server.')
    } finally {
      setNotesLoading(false)
    }
  }

  const handlePyqUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pyqFile) return
    setPyqLoading(true)
    setErrorMsg('')
    setGeneratedPyqs(null)

    const formData = new FormData()
    formData.append('file', pyqFile)
    formData.append('examId', examId)

    try {
      const res = await fetch('/api/generate-pyq-set', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedPyqs(data.pyqSet.questions)
        setSuccessMsg('Previous Year Questions solved and aligned!')
      } else {
        setErrorMsg(data.error || 'Failed to solve past paper questions.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during past paper uploads.')
    } finally {
      setPyqLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
      
      {/* 1. Study Notes Generator */}
      <Card className="bg-[rgb(var(--surface-0))]/60 backdrop-blur-2xl border-slate-200/80 shadow-2xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 to-indigo-500"></div>
        <CardHeader>
          <CardTitle className="text-white font-black text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            AI Notes Generator
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            Generate conceptual guides based on Gemini context-calibration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">Select Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-transparent/80 border border-slate-200/80 rounded-xl p-3 text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-indigo-500/80"
            >
              <option value="">-- Choose a Topic --</option>
              {topics.map((t, idx) => (
                <option key={idx} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleNotesGenerate}
            disabled={notesLoading || !selectedTopic}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
          >
            {notesLoading ? (
              <span className="animate-pulse">Synthesizing Notes...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-sky-400" /> Generate Notes
              </>
            )}
          </Button>

          {generatedNotes && (
            <div className="mt-4 p-4 bg-transparent/60 rounded-xl border border-slate-100 overflow-y-auto max-h-60 text-slate-350 text-xs whitespace-pre-wrap leading-relaxed">
              {generatedNotes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. PYQ Past Paper Solver & Web Searcher */}
      <Card className="bg-[rgb(var(--surface-0))]/60 backdrop-blur-2xl border-slate-200/80 shadow-2xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        <CardHeader>
          <CardTitle className="text-white font-black text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-400" />
            PYQ Solver & Web reference
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            Upload past paper question sheets to auto-solve with verified web references.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <form onSubmit={handlePyqUpload} className="space-y-4">
            <div className="border border-dashed border-slate-200/80 bg-transparent/20 hover:bg-transparent/40 transition-all rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={(e) => setPyqFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-emerald-500/80 mb-2" />
              <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">
                {pyqFile ? pyqFile.name : 'Choose PYQ PDF/CSV/Text file'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Max Limit 10MB</p>
            </div>

            <Button
              type="submit"
              disabled={pyqLoading || !pyqFile}
              className="w-full h-11 bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg"
            >
              {pyqLoading ? (
                <span className="animate-pulse">Solving Past Papers...</span>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Extract & Solve Questions
                </>
              )}
            </Button>
          </form>

          {generatedPyqs && (
            <div className="mt-4 p-4 bg-transparent/60 rounded-xl border border-slate-100 overflow-y-auto max-h-60 space-y-4">
              {generatedPyqs.map((q, idx) => (
                <div key={idx} className="p-3 bg-[rgb(var(--surface-0))]/50 border border-slate-100 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-emerald-400">Q{idx + 1} ({q.marks} Marks)</span>
                  </div>
                  <p className="text-xs font-semibold text-[rgb(var(--text-primary))]">{q.question}</p>
                  <div className="p-2 bg-transparent/80 border border-slate-100 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Verified Answer</span>
                    <p className="text-[11px] text-slate-350 leading-relaxed">{q.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Notifications overlay */}
      {(errorMsg || successMsg) && (
        <div className="col-span-1 md:col-span-2 p-4 rounded-xl border flex items-center gap-3 text-xs bg-[rgb(var(--surface-0))]/50 backdrop-blur-md">
          {errorMsg ? (
            <>
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-rose-400 font-semibold">{errorMsg}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">{successMsg}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
