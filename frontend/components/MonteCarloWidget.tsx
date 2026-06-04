'use client'

import React from 'react'
import { useQuery, gql } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Sparkles, TrendingUp, AlertTriangle, Award, CheckCircle } from 'lucide-react'

const RUN_SIMULATION = gql`
  query RunSimulation($examId: ID!) {
    monteCarloSimulation(examId: $examId) {
      trials
      averageScore
      probabilityAbove75
      probabilityAbove90
      recommendation
      distribution {
        scoreRange
        percentage
      }
    }
  }
`

interface MonteCarloWidgetProps {
  examId: string
}

export default function MonteCarloWidget({ examId }: MonteCarloWidgetProps) {
  const { data, loading, error, refetch } = useQuery(RUN_SIMULATION, {
    variables: { examId },
    skip: !examId
  })

  if (loading) {
    return (
      <Card className="bg-[rgb(var(--surface-0))] border-slate-200 text-white shadow-xl">
        <CardContent className="py-12 text-center text-slate-500">
          <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">Running 10,000 Trial Simulations...</span>
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.monteCarloSimulation) {
    return (
      <Card className="bg-[rgb(var(--surface-0))] border-slate-200 text-white p-6 text-center">
        <p className="text-slate-500 text-xs">Could not run score prediction. Please setup topics and quiz results first.</p>
      </Card>
    )
  }

  const sim = data.monteCarloSimulation
  const avgScore = Math.round(sim.averageScore)
  const prob75 = Math.round(sim.probabilityAbove75)
  const prob90 = Math.round(sim.probabilityAbove90)

  // Find max percentage to scale SVG chart heights
  const maxPct = Math.max(...sim.distribution.map((d: any) => d.percentage), 1)

  return (
    <Card className="bg-[rgb(var(--surface-0))] border-slate-200 text-white shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-500"></div>

      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Monte Carlo Score Simulation
        </div>
        <CardTitle className="text-lg font-bold text-white">Score Probabilities</CardTitle>
        <CardDescription className="text-slate-500 text-xs">
          Forecasting performance using 10,000 trials based on confidence, quiz attempts, and plan completion
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Core Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Average Score */}
          <div className="p-4 bg-transparent/40 border border-slate-100 rounded-2xl text-center">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Expected Score</span>
            <div className="text-3xl font-black text-white">{avgScore}%</div>
            <span className="block text-[10px] text-indigo-400 mt-1 font-medium flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Average Outcome
            </span>
          </div>

          {/* Prob >= 75 */}
          <div className="p-4 bg-transparent/40 border border-slate-100 rounded-2xl text-center">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Pass Chance (75%+)</span>
            <div className="text-3xl font-black text-emerald-400">{prob75}%</div>
            <span className="block text-[10px] text-slate-500 mt-1 font-medium">
              {prob75 > 80 ? '🎖️ Safe Target' : '⚠️ Raise study frequency'}
            </span>
          </div>

          {/* Prob >= 90 */}
          <div className="p-4 bg-transparent/40 border border-slate-100 rounded-2xl text-center">
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Top Chance (90%+)</span>
            <div className="text-3xl font-black text-sky-400">{prob90}%</div>
            <span className="block text-[10px] text-slate-500 mt-1 font-medium">
              {prob90 > 50 ? '💎 High Calibration' : 'Keep revising'}
            </span>
          </div>
        </div>

        {/* Custom SVG Distribution Chart */}
        <div className="space-y-3">
          <span className="block text-xs font-bold text-[rgb(var(--text-muted))] tracking-wide">Probability Density Curve</span>
          <div className="bg-transparent/30 p-4 border border-slate-200/40 rounded-2xl">
            {/* Chart Area */}
            <div className="h-36 flex items-end justify-between gap-2.5 px-2">
              {sim.distribution.map((bar: any, idx: number) => {
                const heightPercent = (bar.percentage / maxPct) * 100
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Bar value tooltip */}
                    <span className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded text-indigo-300 z-20 pointer-events-none">
                      {Math.round(bar.percentage)}%
                    </span>
                    {/* Bar */}
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-600 to-sky-400 rounded-t-lg transition-all duration-700 hover:from-indigo-500 hover:to-sky-300 group-hover:scale-x-105"
                      style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                    ></div>
                  </div>
                )
              })}
            </div>
            {/* X-axis labels */}
            <div className="flex justify-between mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1 border-t border-slate-100 pt-2">
              {sim.distribution.map((bar: any, idx: number) => (
                <div key={idx} className="flex-1 text-center truncate px-0.5">
                  {bar.scoreRange.replace('%', '')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="p-4 bg-[rgb(var(--surface-0))]/50 border border-slate-200 rounded-2xl flex items-start gap-3">
          {avgScore < 60 ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : prob90 > 50 ? (
            <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="block text-[10px] uppercase font-bold text-[rgb(var(--text-muted))] tracking-wider">AI Simulation Advice</span>
            <p className="text-xs text-[rgb(var(--text-primary))] mt-1 leading-relaxed">{sim.recommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
