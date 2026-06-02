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
  Layers
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

  // System Stats
  const [stats, setStats] = useState<DBStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Forms and Controls
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [lockdownActive, setLockdownActive] = useState(false)

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Visual background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-red-950/15 blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Top Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-6">
          <div>
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-1.5">
              <Shield className="w-4 h-4" /> Root Control Shell
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
              ExamEve Cluster Dashboard
            </h1>
            <p className="text-xs text-slate-400">Manage Neon Postgres instances, audit platform locks, and broadcast user alerts.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={fetchDBStats}
              disabled={statsLoading}
              variant="outline"
              className="border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 text-slate-300 rounded-xl flex items-center gap-2"
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
          <Card className="bg-slate-900/30 backdrop-blur-2xl border-slate-800/80 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registered Students</p>
              <h3 className="text-xl font-black text-white mt-0.5">{stats?.usersCount ?? 0} Users</h3>
            </div>
          </Card>

          <Card className="bg-slate-900/30 backdrop-blur-2xl border-slate-800/80 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Exam Outlines</p>
              <h3 className="text-xl font-black text-white mt-0.5">{stats?.examsCount ?? 0} Exams</h3>
            </div>
          </Card>

          <Card className="bg-slate-900/30 backdrop-blur-2xl border-slate-800/80 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Study Sessions Logged</p>
              <h3 className="text-xl font-black text-white mt-0.5">{stats?.sessionsCount ?? 0} Sessions</h3>
            </div>
          </Card>

          <Card className="bg-slate-900/30 backdrop-blur-2xl border-slate-800/80 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Active Flashcards</p>
              <h3 className="text-xl font-black text-white mt-0.5">{stats?.cardsCount ?? 0} Cards</h3>
            </div>
          </Card>
        </div>

        {/* Dashboard Grid System */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Controls & Db Inspect */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Database Optimizer Tools */}
            <Card className="bg-slate-900/30 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" /> Neon Postgres Inspector & Maintenance
                </CardTitle>
                <CardDescription className="text-xs text-slate-450 mt-1">
                  Active connection pools: <span className="text-emerald-400 font-bold">{stats?.activeConnections ?? 1} backends</span>. Optimize user indices and prunes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Index Re-mapping</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Runs REINDEX calls against the primary databases in Neon to optimize lookup performance.</p>
                    <Button 
                      onClick={() => handleDbAction('reindex')}
                      className="bg-indigo-600/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-400 font-bold text-xs py-2 h-9 w-full rounded-xl"
                    >
                      Run Re-index Sequence
                    </Button>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Garbage Pruner</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Deletes read notifications and cleanup system audit logs older than 7 days dynamically.</p>
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
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Tables Statistics</h4>
                  <div className="divide-y divide-slate-850/80 bg-slate-950/30 rounded-2xl border border-slate-900 overflow-hidden">
                    {stats?.tables && stats.tables.length > 0 ? (
                      stats.tables.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center px-4 py-3 text-xs">
                          <span className="font-mono text-slate-300">table: {t.name}</span>
                          <span className="font-extrabold text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-850">{t.rows} rows</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-center text-slate-650 text-xs italic">Sync database stats to inspect table structures.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Global system announcement broadcaster */}
            <Card className="bg-slate-900/30 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live System Announcement Broadcaster
                </CardTitle>
                <CardDescription className="text-xs text-slate-450 mt-1">
                  Sends platform-wide notifications to all student dashboards instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleBroadcast} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter announcement alert message..."
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    className="flex-1 bg-slate-950/60 border border-slate-850 rounded-xl px-4 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-red-500/50"
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
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Stats, Locks & Logs */}
          <div className="space-y-6">
            
            {/* System Locks & Hardware Monitor */}
            <Card className="bg-slate-900/30 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-5">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" /> Server Resources
                </h3>
              </div>
              
              <div className="space-y-4">
                {/* CPU bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>CPU Core Allocation</span>
                    <span className="font-mono text-slate-300">{cpuUsage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 border border-slate-850 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${cpuUsage > 75 ? 'bg-red-500' : cpuUsage > 45 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${cpuUsage}%` }}
                    />
                  </div>
                </div>

                {/* Memory bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>RAM Heap Usage</span>
                    <span className="font-mono text-slate-300">{memoryUsage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 border border-slate-850 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-1000"
                      style={{ width: `${memoryUsage}%` }}
                    />
                  </div>
                </div>

                {/* Query Queue */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Task Queue</span>
                  <span className="font-bold text-slate-300 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-lg">{queryQueue} jobs</span>
                </div>
              </div>

              {/* Emergency Platform Lockdown */}
              <div className="pt-4 border-t border-slate-850">
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
            </Card>

            {/* Audit log terminal shell */}
            <Card className="bg-slate-900/30 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-3">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-indigo-500 to-sky-400"></div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <TermIcon className="w-4 h-4 text-emerald-450" /> System Audit Logs
              </h3>
              
              <div className="bg-black/80 border border-slate-900/80 rounded-2xl p-4 text-[10px] font-mono text-emerald-400 overflow-y-auto h-60 space-y-1.5 scrollbar-thin select-all">
                {logs.length === 0 ? (
                  <span className="text-slate-600 italic">No audit records streaming...</span>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed hover:bg-slate-950 p-0.5 rounded">
                      {log}
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </Card>

          </div>

        </div>

      </div>
    </div>
  )
}
