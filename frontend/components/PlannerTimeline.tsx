import { usePlanStore, PlanBlock } from '@/store/planStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ChevronRight, Ban, Play } from 'lucide-react'

interface PlannerTimelineProps {
  onStartBlock: (block: PlanBlock) => void
  onSkipBlock: (blockId: string) => void
  onCompleteBlock: (blockId: string) => void
}

export default function PlannerTimeline({
  onStartBlock,
  onSkipBlock,
  onCompleteBlock
}: PlannerTimelineProps) {
  const { plan } = usePlanStore()

  if (!plan || !plan.blocks || plan.blocks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 bg-[rgb(var(--surface-0))]/20 rounded-3xl border border-slate-200/40 shadow-xl">
        No active study plan. Go to onboarding to create one!
      </div>
    )
  }

  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getBlockTypeStyles = (type: PlanBlock['blockType']) => {
    switch (type) {
      case 'STUDY': 
        return {
          border: 'border-l-indigo-500/80',
          dot: 'bg-indigo-500 shadow-indigo-500/20',
          text: 'text-indigo-400',
          bg: 'from-indigo-500/5 via-transparent to-transparent'
        }
      case 'QUIZ': 
        return {
          border: 'border-l-sky-500/80',
          dot: 'bg-sky-500 shadow-sky-500/20',
          text: 'text-sky-400',
          bg: 'from-sky-500/5 via-transparent to-transparent'
        }
      case 'REVISION': 
        return {
          border: 'border-l-emerald-500/80',
          dot: 'bg-emerald-500 shadow-emerald-500/20',
          text: 'text-emerald-400',
          bg: 'from-emerald-500/5 via-transparent to-transparent'
        }
      case 'BREAK': 
        return {
          border: 'border-l-amber-500/80',
          dot: 'bg-amber-500 shadow-amber-500/20',
          text: 'text-amber-400',
          bg: 'from-amber-500/5 via-transparent to-transparent'
        }
      default: 
        return {
          border: 'border-l-slate-700',
          dot: 'bg-slate-700',
          text: 'text-[rgb(var(--text-muted))]',
          bg: 'bg-transparent/20'
        }
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative border-l border-slate-200/80 ml-6 pl-8 space-y-6">
        {plan.blocks.map((block) => {
          const styles = getBlockTypeStyles(block.blockType)
          return (
            <div key={block.id} className="relative group">
              {/* Timeline Dot Indicator */}
              <span className={`absolute -left-[41px] top-1/2 -translate-y-1/2 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-transparent border border-slate-200 ring-4 ring-slate-900/60 z-10 transition-transform group-hover:scale-110`}>
                <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} shadow-lg`}></span>
              </span>

              <Card className={`bg-[rgb(var(--surface-0))]/40 backdrop-blur-2xl border border-slate-200/80 border-l-4 ${styles.border} shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-200 hover:translate-x-0.5`}>
                {/* Visual gradient highlight */}
                <div className={`absolute inset-0 bg-gradient-to-r ${styles.bg} opacity-80 pointer-events-none`}></div>
                
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                        {formatTime(block.scheduledStart)}
                      </span>
                      <span className="text-[10px] font-bold bg-transparent/80 text-[rgb(var(--text-muted))] px-2 py-0.5 rounded-lg border border-slate-200">
                        {block.durationMins} mins
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide capitalize ${
                        block.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        block.status === 'SKIPPED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-transparent text-[rgb(var(--text-muted))] border-slate-200'
                      }`}>
                        {block.status.toLowerCase()}
                      </span>
                    </div>
                    
                    <h4 className="text-lg font-bold text-white tracking-tight leading-snug">
                      {block.topic.name}
                    </h4>
                    <p className="text-xs text-[rgb(var(--text-muted))] font-medium">
                      Exam weightage: <span className="text-slate-350 font-bold">{block.topic.weightage}%</span> | Estimated prep: <span className="text-slate-350 font-bold">{block.topic.estimatedHours} hrs</span>
                    </p>
                  </div>

                  {block.status === 'PENDING' && (
                    <div className="flex items-center gap-2 self-start md:self-center">
                      {block.blockType === 'STUDY' && (
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-9 px-4 flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 transition-transform active:scale-[0.98]"
                          onClick={() => onStartBlock(block)}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Start Study
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-200 bg-transparent/40 hover:bg-slate-100 text-slate-350 font-semibold rounded-xl h-9 px-3.5"
                        onClick={() => onSkipBlock(block.id)}
                      >
                        <Ban className="w-3.5 h-3.5" /> Skip
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-400 hover:text-emerald-350 hover:bg-emerald-500/5 font-bold rounded-xl h-9 px-3.5 flex items-center gap-1"
                        onClick={() => onCompleteBlock(block.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
