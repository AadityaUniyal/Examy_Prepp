'use client'

import React from 'react'
import { usePlanStore, PlanBlock } from '@/store/planStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Ban, Play, Calendar as CalendarIcon, Sparkles } from 'lucide-react'

interface PlannerCalendarProps {
  onStartBlock: (block: PlanBlock) => void
  onSkipBlock: (blockId: string) => void
  onCompleteBlock: (blockId: string) => void
}

export default function PlannerCalendar({
  onStartBlock,
  onSkipBlock,
  onCompleteBlock
}: PlannerCalendarProps) {
  const { plan } = usePlanStore()

  if (!plan || !plan.blocks || plan.blocks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 bg-slate-900/20 rounded-3xl border border-slate-900/60 shadow-xl">
        No active study plan. Go to onboarding to create one!
      </div>
    )
  }

  // Helper to format block time (e.g., 09:30 AM)
  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Group blocks by date (YYYY-MM-DD)
  const groupBlocksByDay = () => {
    const groups: { [key: string]: PlanBlock[] } = {}
    plan.blocks.forEach((block) => {
      const dateKey = new Date(block.scheduledStart).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(block)
    })
    return groups
  }

  const groupedDays = groupBlocksByDay()

  const getBlockTypeStyles = (type: PlanBlock['blockType']) => {
    switch (type) {
      case 'STUDY':
        return {
          border: 'border-indigo-500/30 border-t-indigo-500/80',
          dot: 'bg-indigo-500 shadow-indigo-500/20',
          text: 'text-indigo-400',
          bg: 'bg-indigo-950/10'
        }
      case 'QUIZ':
        return {
          border: 'border-sky-500/30 border-t-sky-500/80',
          dot: 'bg-sky-500 shadow-sky-500/20',
          text: 'text-sky-400',
          bg: 'bg-sky-950/10'
        }
      case 'REVISION':
        return {
          border: 'border-emerald-500/30 border-t-emerald-500/80',
          dot: 'bg-emerald-500 shadow-emerald-500/20',
          text: 'text-emerald-400',
          bg: 'bg-emerald-950/10'
        }
      case 'BREAK':
        return {
          border: 'border-amber-500/30 border-t-amber-500/80',
          dot: 'bg-amber-500 shadow-amber-500/20',
          text: 'text-amber-400',
          bg: 'bg-amber-950/10'
        }
      default:
        return {
          border: 'border-slate-800 border-t-slate-700',
          dot: 'bg-slate-700',
          text: 'text-slate-400',
          bg: 'bg-slate-900/10'
        }
    }
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedDays).map(([dayLabel, blocks]) => (
        <div key={dayLabel} className="space-y-4">
          {/* Day Label Header */}
          <div className="flex items-center gap-2.5 text-slate-400 border-b border-slate-900 pb-2">
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
              {dayLabel}
            </h3>
            <span className="text-[10px] font-bold bg-slate-900 text-slate-550 px-2 py-0.5 rounded-lg border border-slate-850">
              {blocks.length} blocks scheduled
            </span>
          </div>

          {/* Sprints Grid inside the Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {blocks.map((block) => {
              const styles = getBlockTypeStyles(block.blockType)
              return (
                <Card 
                  key={block.id}
                  className={`bg-slate-900/20 backdrop-blur-2xl border ${styles.border} border-t-4 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-700 hover:-translate-y-0.5 flex flex-col justify-between`}
                >
                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                          {formatTime(block.scheduledStart)}
                        </span>
                        <div className="flex gap-1.5 items-center">
                          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}></span>
                          <span className={`text-[9px] font-extrabold tracking-wider uppercase ${styles.text}`}>
                            {block.blockType}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-base font-extrabold text-white tracking-tight leading-snug">
                        {block.topic.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Duration: <span className="text-slate-400 font-bold">{block.durationMins}m</span>
                        {block.topic.weightage > 0 && (
                          <> | Weightage: <span className="text-slate-400 font-bold">{block.topic.weightage}%</span></>
                        )}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-900/60 flex items-center justify-between gap-2 mt-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase ${
                        block.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        block.status === 'SKIPPED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {block.status.toLowerCase()}
                      </span>

                      {block.status === 'PENDING' && (
                        <div className="flex gap-1.5">
                          {block.blockType === 'STUDY' && (
                            <Button
                              size="sm"
                              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg h-7.5 px-3 flex items-center gap-1 text-[10px] transition-transform active:scale-[0.98]"
                              onClick={() => onStartBlock(block)}
                            >
                              <Play className="w-3 h-3 fill-current" /> Start
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-800 bg-slate-950/40 hover:bg-slate-800 text-slate-400 font-semibold rounded-lg h-7.5 px-2 text-[10px]"
                            onClick={() => onSkipBlock(block.id)}
                          >
                            <Ban className="w-3 h-3" /> Skip
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-400 hover:text-emerald-350 hover:bg-emerald-500/5 font-bold rounded-lg h-7.5 px-2 text-[10px] flex items-center gap-0.5"
                            onClick={() => onCompleteBlock(block.id)}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
