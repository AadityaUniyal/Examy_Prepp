'use client'

import React, { useState } from 'react'
import { useQuery, gql } from '@apollo/client'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { Calendar, Clock, Zap, Target, BookOpen, AlertCircle, ArrowUpRight, Shield } from 'lucide-react'

const GET_MY_ANALYTICS = gql`
  query GetMyAnalytics {
    myAnalytics {
      totalStudyHours
      sessionsCompleted
      averageEnergy
      topicBreakdown {
        topicName
        hours
        confidence
      }
      weeklyHours
    }
  }
`

export default function AnalyticsPage() {
  const { data, loading, error } = useQuery(GET_MY_ANALYTICS, {
    fetchPolicy: 'cache-and-network'
  })

  const [activeTimeframe, setActiveTimeframe] = useState<'week' | 'month'>('week')

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse text-slate-100">
        <div className="h-10 w-48 bg-slate-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl border border-slate-700/50"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-800 rounded-2xl border border-slate-700/50"></div>
          <div className="h-96 bg-slate-800 rounded-2xl border border-slate-700/50"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto" />
          <h2 className="text-xl font-bold">Analytics Load Failed</h2>
          <p className="text-sm opacity-80">{error.message}</p>
        </div>
      </div>
    )
  }

  const analytics = data?.myAnalytics || {
    totalStudyHours: 0,
    sessionsCompleted: 0,
    averageEnergy: 5.0,
    topicBreakdown: [],
    weeklyHours: [0, 0, 0, 0, 0, 0, 0]
  }

  // Map weekly hours data
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weeklyData = analytics.weeklyHours.map((hours: number, idx: number) => ({
    name: daysOfWeek[idx] || `Day ${idx + 1}`,
    Hours: hours
  }))

  // Colors mapping for charts
  const CHART_COLORS = ['#818cf8', '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa']

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-slate-100 min-h-screen pb-16">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Performance Analytics
          </h1>
          <p className="text-slate-400 mt-1">Real-time learning stats, habits, and confidence analytics.</p>
        </div>
        <div className="flex bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTimeframe('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTimeframe === 'week' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Weekly View
          </button>
          <button 
            onClick={() => setActiveTimeframe('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTimeframe === 'month' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Monthly View
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl flex items-center gap-4 hover:border-slate-700/50 transition-all group">
          <div className="p-4 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Study Time</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{analytics.totalStudyHours.toFixed(1)} hrs</h3>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl flex items-center gap-4 hover:border-slate-700/50 transition-all group">
          <div className="p-4 bg-sky-500/10 rounded-xl text-sky-400 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sessions Logged</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{analytics.sessionsCompleted}</h3>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl flex items-center gap-4 hover:border-slate-700/50 transition-all group">
          <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Energy Score</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{analytics.averageEnergy.toFixed(1)} / 10</h3>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl flex items-center gap-4 hover:border-slate-700/50 transition-all group">
          <div className="p-4 bg-pink-500/10 rounded-xl text-pink-400 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Mastery</p>
            <h3 className="text-2xl font-bold mt-1 text-white">
              {analytics.topicBreakdown.length > 0 
                ? (analytics.topicBreakdown.reduce((acc: number, t: { confidence: number }) => acc + t.confidence, 0) / analytics.topicBreakdown.length * 10).toFixed(0)
                : 0}%
            </h3>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Study Hours Progression */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Focus Progression
            </h2>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +12.4% vs last week
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Hours" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#hoursGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Time Distribution */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-3xl shadow-xl space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" /> Study Distribution
          </h2>
          <div className="h-80 w-full flex items-center justify-center">
            {analytics.topicBreakdown.length === 0 ? (
              <div className="text-center text-slate-500 text-sm">
                No study data recorded yet. Start log blocks to build analysis metrics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.topicBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="hours"
                    nameKey="topicName"
                  >
                    {analytics.topicBreakdown.map((entry: { topicName: string; hours: number; confidence: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Mastery and Confidence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Topic Confidence radar */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-3xl shadow-xl space-y-4 lg:col-span-2">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" /> Topic Confidence Matrix
          </h2>
          <div className="h-80 w-full">
            {analytics.topicBreakdown.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-24">No topic masteries.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.topicBreakdown}>
                  <PolarGrid stroke="#475569" opacity={0.3} />
                  <PolarAngleAxis dataKey="topicName" stroke="#94a3b8" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#475569" />
                  <Radar name="Confidence" dataKey="confidence" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Actionable recommendations */}
        <div className="bg-gradient-to-b from-slate-900/50 to-indigo-950/20 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Smart Insights
            </h2>
            <div className="space-y-4 mt-2">
              <div className="flex gap-3 bg-slate-850/60 p-4 rounded-xl border border-slate-800">
                <Target className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Priority Target</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Focus study hours on low-mastery categories to balance coverage.</p>
                </div>
              </div>
              <div className="flex gap-3 bg-slate-850/60 p-4 rounded-xl border border-slate-800">
                <Clock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Ideal Session Block</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Your energy peaks when doing study blocks between 45-60 mins.</p>
                </div>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" /> Recalibrate Schedule
          </button>
        </div>
      </div>
    </div>
  )
}
