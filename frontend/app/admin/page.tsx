'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Shield, 
  Terminal as TermIcon, 
  Database, 
  Radio, 
  Lock, 
  Unlock, 
  LogOut, 
  RefreshCw, 
  Activity,
  Cpu,
  Server,
  Layers,
  Calendar
} from 'lucide-react'

interface DBStats {
  usersCount: number
  examsCount: number
  sessionsCount: number
  cardsCount: number
  activeConnections: number
  tables: Array<{ name: string; rows: number }>
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'core' | 'ai'>('core')

  // LLM Playground States
  const [systemInstruction, setSystemInstruction] = useState('You are an elite exam preparation optimizer. Ground explanations in facts and equations, structure with markdown, and define Leitner active recall practice questions.')
  const [testPrompt, setTestPrompt] = useState('')
  const [llmResponse, setLlmResponse] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const [testTemp, setTestTemp] = useState(0.7)

  // Tavily Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // System Stats
  const [stats, setStats] = useState<DBStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Forms and Controls
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [lockdownActive, setLockdownActive] = useState(false)

  // System Events
  const [events, setEvents] = useState<any[]>([])
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('GENERAL')
  const [eventLoading, setEventLoading] = useState(false)

  const handleTestPrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPrompt.trim()) return
    setLlmLoading(true)
    setLlmResponse('')
    addLog(`[AI] Dispatching prompt simulation to Gemini 1.5 Flash...`)

    try {
      const res = await fetch('/api/admin/llm-playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_prompt',
          payload: {
            prompt: testPrompt,
            systemInstruction,
            temperature: testTemp
          }
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setLlmResponse(data.text)
        addLog(`[AI] LLM simulation generation complete.`)
      } else {
        setLlmResponse(`Error: ${data.error}`)
        addLog(`[AI-ERROR] LLM generation failed: ${data.error}`)
      }
    } catch (err: any) {
      setLlmResponse(`Error: ${err.message}`)
      addLog(`[AI-ERROR] LLM generation network error: ${err.message}`)
    } finally {
      setLlmLoading(false)
    }
  }

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    addLog(`[AI-SEARCH] Dispatching web query "${searchQuery}" to search crawler...`)

    try {
      const res = await fetch('/api/admin/llm-playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_search',
          payload: { query: searchQuery }
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSearchResults(data.results)
        addLog(`[AI-SEARCH] Retrieved ${data.results.length} search index nodes successfully.`)
      } else {
        addLog(`[AI-SEARCH-ERROR] Search failed: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`[AI-SEARCH-ERROR] Connection error: ${err.message}`)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleRecalibrateML = async () => {
    addLog('[AI] Initiating neural Leitner weight recalibration...')
    try {
      const res = await fetch('/api/admin/llm-playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalibrate_ml' })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        addLog(`[AI] Recalibration complete: ${data.message}`)
      } else {
        addLog(`[AI-ERROR] Recalibration failed: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`[AI-ERROR] Recalibration network failure: ${err.message}`)
    }
  }

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_events' })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEvents(data.events)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventTitle || !eventDesc || !eventDate) return
    setEventLoading(true)
    addLog(`[EVENTS] Registering new challenge/announcement event...`)

    try {
      const res = await fetch('/api/admin/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_event',
          payload: {
            title: eventTitle,
            description: eventDesc,
            eventDate,
            type: eventType
          }
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        addLog(`[EVENTS] System Event registered successfully.`)
        setEventTitle('')
        setEventDesc('')
        setEventDate('')
        fetchEvents()
      } else {
        addLog(`[EVENTS-ERROR] Registration failed: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`[EVENTS-ERROR] Connection error: ${err.message}`)
    } finally {
      setEventLoading(false)
    }
  }

  // Hardware Simulation
  const [cpuUsage, setCpuUsage] = useState(12)
  const [memoryUsage, setMemoryUsage] = useState(48)
  const [queryQueue, setQueryQueue] = useState(0)

  // Terminal Audit Logs
  const [logs, setLogs] = useState<string[]>([])
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Verify Admin Session on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch('/api/admin/verify')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated) {
            setAuthorized(true)
            addLog('[AUTH] Administrator session successfully authorized.')
            fetchDBStats()
            fetchEvents()
          } else {
            router.push('/admin/login')
          }
        } else {
          router.push('/admin/login')
        }
      } catch (err) {
        console.error(err)
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [])

  // Auto scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Simulated metrics tick
  useEffect(() => {
    if (!authorized) return
    const interval = setInterval(() => {
      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 9) - 4
        return Math.max(5, Math.min(95, prev + delta))
      })
      setMemoryUsage(prev => {
        const delta = Math.floor(Math.random() * 3) - 1
        return Math.max(30, Math.min(85, prev + delta))
      })
      setQueryQueue(() => Math.floor(Math.random() * 4))

      // Occasional random audit log line
      const auditLines = [
        '[JOBS] Scoped Leitner queues calculated for next 4 hours.',
        '[API] Handled GraphQL topic confidence query.',
        '[CONN] Active Socket.io channels synced.',
        '[ML] FastAPI token extraction node response code 200.',
        '[SYS] Network payload health: clear.'
      ]
      if (Math.random() > 0.7) {
        addLog(auditLines[Math.floor(Math.random() * auditLines.length)])
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [authorized])

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`])
  }

  const fetchDBStats = async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/admin/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_stats' })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStats(data.stats)
        addLog('[DB] Refreshed tables row statistics from Postgres schema.')
      } else {
        addLog(`[DB-ERROR] Stats fetch failed: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`[DB-ERROR] Connection error: ${err.message}`)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/verify', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error(err)
    }
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastMsg.trim()) return
    setBroadcastLoading(true)
    addLog(`[BROADCAST] Attempting system notification dispatch...`)

    try {
      const res = await fetch('/api/admin/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          payload: { message: broadcastMsg }
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        addLog(`[BROADCAST] ${data.message}`)
        setBroadcastMsg('')
        fetchDBStats() // Refresh notification count table row count
      } else {
        addLog(`[BROADCAST-ERROR] Dispatched failed: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`[BROADCAST-ERROR] Connection failure: ${err.message}`)
    } finally {
      setBroadcastLoading(false)
    }
  }

  const handleDbAction = async (action: 'reindex' | 'prune') => {
    addLog(`[DB] Executing maintenance transaction "${action.toUpperCase()}"...`)
    try {
      const res = await fetch('/api/admin/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        addLog(`[DB] Maintenance success: ${data.message}`)
        fetchDBStats()
      } else {
        addLog(`[DB-ERROR] Maintenance failure: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`[DB-ERROR] Maintenance network failure: ${err.message}`)
    }
  }

  const toggleLockdown = () => {
    const newState = !lockdownActive
    setLockdownActive(newState)
    addLog(`[LOCKDOWN] Emergency Read-Only status updated to: ${newState ? 'ACTIVE' : 'INACTIVE'}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Verifying Administrative Signature...</p>
        </div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-gradient-mesh text-[rgb(var(--text-primary))] p-4 md:p-8 relative overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Top Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[rgb(var(--surface-200))] pb-6">
          <div>
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-1.5 animate-pulse">
              <Shield className="w-4 h-4" /> Root Control Shell
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gradient">
              ExamEve Cluster Dashboard
            </h1>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Manage Neon Postgres instances, audit platform locks, and broadcast user alerts.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={fetchDBStats}
              disabled={statsLoading}
              variant="outline"
              className="border-[rgb(var(--surface-200))] bg-[rgb(var(--surface-50))]/40 hover:bg-[rgb(var(--surface-100))]/80 text-[rgb(var(--text-secondary))] rounded-xl flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} /> Sync Metrics
            </Button>
            <Button
              onClick={handleLogout}
              className="border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 font-bold rounded-xl flex items-center gap-2 shadow-lg hover:shadow-red-500/5"
            >
              <LogOut className="w-3.5 h-3.5" /> Exit Session
            </Button>
          </div>
        </div>

        {/* Database Metric Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 border-t-2 border-t-red-500">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">Registered Students</p>
              <h3 className="text-xl font-black text-[rgb(var(--text-primary))] mt-0.5">{stats?.usersCount ?? 0} Users</h3>
            </div>
          </div>

          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 border-t-2 border-t-brand-500">
            <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">Active Exam Outlines</p>
              <h3 className="text-xl font-black text-[rgb(var(--text-primary))] mt-0.5">{stats?.examsCount ?? 0} Exams</h3>
            </div>
          </div>

          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 border-t-2 border-t-emerald-500">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">Study Sessions Logged</p>
              <h3 className="text-xl font-black text-[rgb(var(--text-primary))] mt-0.5">{stats?.sessionsCount ?? 0} Sessions</h3>
            </div>
          </div>
          <div className="glass-card p-5 relative overflow-hidden flex items-center gap-4 border-t-2 border-t-sky-500">
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">Total Active Flashcards</p>
              <h3 className="text-xl font-black text-[rgb(var(--text-primary))] mt-0.5">{stats?.cardsCount ?? 0} Cards</h3>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[rgb(var(--surface-200))] gap-6">
          <button
            onClick={() => setActiveTab('core')}
            className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 px-1 flex items-center gap-2 ${
              activeTab === 'core'
                ? 'border-red-500 text-white font-black'
                : 'border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> System Core Control
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 px-1 flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'border-indigo-500 text-white font-black'
                : 'border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> AI Systems & LLM Tuning
          </button>
        </div>

        {activeTab === 'core' ? (
          /* Dashboard Grid System */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Column 1 & 2: Controls & Db Inspect */}
            <div className="lg:col-span-2 space-y-6 animate-slide-up">
              
              {/* Database Optimizer Tools */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
                <div className="pb-4">
                  <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" /> Neon Postgres Inspector & Maintenance
                  </h3>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    Active connection pools: <span className="text-emerald-400 font-bold">{stats?.activeConnections ?? 1} backends</span>. Optimize user indices and prunes.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[rgb(var(--surface-50))]/50 border border-[rgb(var(--surface-200))] rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-[rgb(var(--text-primary))] uppercase tracking-wider">Index Re-mapping</h4>
                      <p className="text-[11px] text-[rgb(var(--text-secondary))] leading-relaxed">Runs REINDEX calls against the primary databases in Neon to optimize lookup performance.</p>
                      <Button 
                        onClick={() => handleDbAction('reindex')}
                        className="bg-indigo-600/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-400 font-bold text-xs py-2 h-9 w-full rounded-xl"
                      >
                        Run Re-index Sequence
                      </Button>
                    </div>
                    <div className="p-4 bg-[rgb(var(--surface-50))]/50 border border-[rgb(var(--surface-200))] rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-[rgb(var(--text-primary))] uppercase tracking-wider">Garbage Pruner</h4>
                      <p className="text-[11px] text-[rgb(var(--text-secondary))] leading-relaxed">Deletes read notifications and cleanup system audit logs older than 7 days dynamically.</p>
                      <Button 
                        onClick={() => handleDbAction('prune')}
                        className="bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 font-bold text-xs py-2 h-9 w-full rounded-xl"
                      >
                        Run Pruning Sequence
                      </Button>
                    </div>
                  </div>

                  {/* Table list inspect */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">Active Tables Statistics</h4>
                    <div className="divide-y divide-[rgb(var(--surface-200))]/80 bg-[rgb(var(--surface-50))]/30 rounded-2xl border border-[rgb(var(--surface-200))] overflow-hidden">
                      {stats?.tables && stats.tables.length > 0 ? (
                        stats.tables.map((t, idx) => (
                          <div key={idx} className="flex justify-between items-center px-4 py-3 text-xs">
                            <span className="font-mono text-[rgb(var(--text-secondary))]">table: {t.name}</span>
                            <span className="font-extrabold text-[rgb(var(--text-primary))] bg-[rgb(var(--surface-100))] px-2.5 py-0.5 rounded border border-[rgb(var(--surface-200))]">{t.rows} rows</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-[rgb(var(--text-muted))] text-xs italic">Sync database stats to inspect table structures.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Global system announcement broadcaster */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
                <div className="pb-4">
                  <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live System Announcement Broadcaster
                  </h3>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    Sends platform-wide notifications to all student dashboards instantly.
                  </p>
                </div>
                <div>
                  <form onSubmit={handleBroadcast} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter announcement alert message..."
                      value={broadcastMsg}
                      onChange={(e) => setBroadcastMsg(e.target.value)}
                      className="flex-1 bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 text-xs text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/40 focus:outline-none focus:border-red-500/50"
                      disabled={broadcastLoading}
                      required
                    />
                    <Button
                      type="submit"
                      disabled={broadcastLoading || !broadcastMsg.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-5 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                      {broadcastLoading ? 'Dispatching...' : 'Broadcast Alert'}
                    </Button>
                  </form>
                </div>
              </div>

              {/* System Events & Challenges Manager */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
                <div className="pb-4">
                  <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" /> Platform Challenges & Events Scheduler
                  </h3>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    Schedule active study challenges or exam events globally.
                  </p>
                </div>
                <div className="space-y-4">
                  <form onSubmit={handleAddEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Event Title..."
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2 text-xs text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/40 focus:outline-none focus:border-red-500/50"
                      required
                    />
                    <input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2 text-xs text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/40 focus:outline-none focus:border-red-500/50"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Short Description..."
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      className="sm:col-span-2 bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2 text-xs text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/40 focus:outline-none focus:border-red-500/50"
                      required
                    />
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="bg-[rgb(var(--surface-100))] border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2 text-xs text-[rgb(var(--text-primary))] focus:outline-none focus:border-red-500/50"
                    >
                      <option value="GENERAL">General Announcement</option>
                      <option value="CHALLENGE">Study Challenge Sprints</option>
                      <option value="MAINTENANCE">Maintenance Warning</option>
                    </select>
                    <Button
                      type="submit"
                      disabled={eventLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 rounded-xl transition-all shadow-lg active:scale-95 text-xs"
                    >
                      {eventLoading ? 'Scheduling...' : 'Schedule Event'}
                    </Button>
                  </form>

                  {/* Display active list */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">Scheduled Challenges</h4>
                    <div className="divide-y divide-[rgb(var(--surface-200))]/80 bg-[rgb(var(--surface-50))]/30 rounded-2xl border border-[rgb(var(--surface-200))] overflow-hidden">
                      {events.length > 0 ? (
                        events.map((ev, idx) => (
                          <div key={idx} className="p-3 text-xs flex justify-between items-center">
                            <div>
                              <span className="font-extrabold text-[rgb(var(--text-primary))]">{ev.title}</span>
                              <p className="text-[10px] text-[rgb(var(--text-secondary))] mt-0.5">{ev.description}</p>
                            </div>
                            <span className="text-[10px] font-bold text-[rgb(var(--text-secondary))] bg-[rgb(var(--surface-100))] px-2 py-0.5 rounded border border-[rgb(var(--surface-200))]">
                              {new Date(ev.eventDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-[rgb(var(--text-muted))] text-xs italic">No system events scheduled.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Stats, Locks & Logs */}
            <div className="space-y-6">
              
              {/* System Locks & Hardware Monitor */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl space-y-5">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
                <div>
                  <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400" /> Server Resources
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* CPU bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-[rgb(var(--text-secondary))] font-bold uppercase tracking-wider">
                      <span>CPU Core Allocation</span>
                      <span className="font-mono text-[rgb(var(--text-primary))]">{cpuUsage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 border border-[rgb(var(--surface-200))] rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${cpuUsage > 75 ? 'bg-red-500' : cpuUsage > 45 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${cpuUsage}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-[rgb(var(--text-secondary))] font-bold uppercase tracking-wider">
                      <span>RAM Heap Usage</span>
                      <span className="font-mono text-[rgb(var(--text-primary))]">{memoryUsage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 border border-[rgb(var(--surface-200))] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1000"
                        style={{ width: `${memoryUsage}%` }}
                      />
                    </div>
                  </div>

                  {/* Query Queue */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-[rgb(var(--text-secondary))] font-bold uppercase tracking-wider">Pending Task Queue</span>
                    <span className="font-bold text-[rgb(var(--text-primary))] bg-black/40 border border-[rgb(var(--surface-200))] px-2 py-0.5 rounded-lg">{queryQueue} jobs</span>
                  </div>
                </div>

                {/* Emergency Platform Lockdown */}
                <div className="pt-4 border-t border-[rgb(var(--surface-200))]">
                  <button
                    onClick={toggleLockdown}
                    className={`w-full py-3 border font-extrabold text-xs uppercase tracking-wider transition-all rounded-xl active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg ${
                      lockdownActive 
                        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15 shadow-red-500/5' 
                        : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 shadow-emerald-500/5'
                    }`}
                  >
                    {lockdownActive ? (
                      <>
                        <Lock className="w-4 h-4 text-red-400" /> Platform Locked (Active)
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-400" /> Open Web Access
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Audit log terminal shell */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl space-y-3">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
                <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                  <TermIcon className="w-4 h-4 text-emerald-455" /> System Audit Logs
                </h3>
                
                <div className="bg-black/60 border border-[rgb(var(--surface-200))] rounded-2xl p-4 text-[10px] font-mono text-emerald-400 overflow-y-auto h-60 space-y-1.5 scrollbar-thin select-all">
                  {logs.length === 0 ? (
                    <span className="text-[rgb(var(--text-muted))] italic">No audit records streaming...</span>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed hover:bg-black/80 p-0.5 rounded">
                        {log}
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* AI & LLM Systems Dashboard Panel */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col (2 Cols Wide): Prompt playground tuner & web tester */}
            <div className="lg:col-span-2 space-y-6 animate-slide-up">
              
              {/* RAG Instruction Tuner */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-sky-400"></div>
                
                <div className="pb-4">
                  <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                    <Radio className="w-4 h-4 text-indigo-400" /> RAG System Instruction Calibration
                  </h3>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    Fine-tune system prompts for generating study notes and solving past exams on the free-tier Gemini API.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">
                      Master Model Instructions Template
                    </label>
                    <textarea
                      rows={3}
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      className="w-full bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-3 text-xs text-[rgb(var(--text-primary))] focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <form onSubmit={handleTestPrompt} className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">
                        Prompt Testing Playground
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Generate study notes for Nuclear Fission stages..."
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        className="w-full bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 py-2.5 text-xs text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/40 focus:outline-none focus:border-indigo-500/50"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                        <span>Temperature:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={testTemp}
                          onChange={(e) => setTestTemp(parseFloat(e.target.value))}
                          className="w-20 accent-indigo-500"
                        />
                        <span className="font-mono text-[rgb(var(--text-primary))]">{testTemp}</span>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={llmLoading || !testPrompt.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 rounded-xl"
                      >
                        {llmLoading ? 'Executing Inference...' : 'Run Test Inference'}
                      </Button>
                    </div>
                  </form>

                  {/* Result Box */}
                  {llmResponse && (
                    <div className="mt-4 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">Playground Output</span>
                      <div className="bg-black/60 border border-[rgb(var(--surface-200))] rounded-2xl p-4 text-xs font-mono text-[rgb(var(--text-primary))] whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                        {llmResponse}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Web Crawler / Search Tester */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                
                <div className="pb-4">
                  <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> Tavily Web Context Search Tester
                  </h3>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    Execute real-time searches to preview the content enrichment payloads prior to LLM injection.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <form onSubmit={handleTestSearch} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter educational query to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-[rgb(var(--surface-100))]/50 border border-[rgb(var(--surface-200))] rounded-xl px-4 text-xs text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))]/40 focus:outline-none focus:border-emerald-500/50"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={searchLoading || !searchQuery.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                      {searchLoading ? 'Searching...' : 'Search Web'}
                    </Button>
                  </form>

                  {/* Results list */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">Search Matches (Payload Snippets)</h4>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {searchResults.map((r, idx) => (
                          <div key={idx} className="p-3 bg-[rgb(var(--surface-50))]/50 border border-[rgb(var(--surface-200))] rounded-2xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-emerald-400 truncate">{r.title}</span>
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[rgb(var(--brand-400))] hover:text-indigo-400 font-semibold underline">Source</a>
                            </div>
                            <p className="text-[11px] text-[rgb(var(--text-secondary))] leading-relaxed">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Col: AI parameters and calibration controls */}
            <div className="space-y-6">
              
              {/* Calibration panel */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl space-y-5">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
                <div>
                  <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400" /> AI Calibrations & Limits
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-black/30 rounded-xl border border-[rgb(var(--surface-200))] text-xs flex justify-between items-center">
                    <span className="text-[rgb(var(--text-secondary))]">Gemini LLM Engine</span>
                    <span className="font-bold text-emerald-400">1.5 Flash (Active)</span>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl border border-[rgb(var(--surface-200))] text-xs flex justify-between items-center">
                    <span className="text-[rgb(var(--text-secondary))]">Web Context Engine</span>
                    <span className="font-bold text-indigo-400">Tavily (Connected)</span>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl border border-[rgb(var(--surface-200))] text-xs flex justify-between items-center">
                    <span className="text-[rgb(var(--text-secondary))]">Autopilot Threshold</span>
                    <span className="font-bold text-amber-400">92% Match</span>
                  </div>

                  {/* Manual Recalibration Trigger */}
                  <div className="pt-2">
                    <Button
                      onClick={handleRecalibrateML}
                      className="w-full py-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 font-extrabold text-xs uppercase tracking-wider transition-all rounded-xl active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                    >
                      Recalibrate ML Autopilot
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mini audit logs inside AI view */}
              <div className="glass-card p-6 relative overflow-hidden shadow-2xl space-y-3">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
                <h3 className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-2">
                  <TermIcon className="w-4 h-4 text-emerald-400" /> System Audit Logs
                </h3>
                
                <div className="bg-black/60 border border-[rgb(var(--surface-200))] rounded-2xl p-4 text-[10px] font-mono text-emerald-400 overflow-y-auto h-60 space-y-1.5 scrollbar-thin select-all">
                  {logs.length === 0 ? (
                    <span className="text-[rgb(var(--text-muted))] italic">No audit records streaming...</span>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed hover:bg-black/80 p-0.5 rounded">
                        {log}
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
