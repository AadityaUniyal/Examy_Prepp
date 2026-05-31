import { usePlanStore, PlanBlock } from '@/store/planStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
      <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm">
        No active study plan. Go to onboarding to create one!
      </div>
    )
  }

  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getBlockTypeColor = (type: PlanBlock['blockType']) => {
    switch (type) {
      case 'STUDY': return 'border-l-blue-500 bg-blue-50/50 text-blue-800'
      case 'QUIZ': return 'border-l-purple-500 bg-purple-50/50 text-purple-800'
      case 'REVISION': return 'border-l-teal-500 bg-teal-50/50 text-teal-800'
      case 'BREAK': return 'border-l-amber-500 bg-amber-50/50 text-amber-800'
      default: return 'border-l-slate-500 bg-slate-50/50 text-slate-800'
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
        {plan.blocks.map((block) => (
          <div key={block.id} className="relative">
            {/* Circle on timeline */}
            <span className="absolute -left-[31px] top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 border-2 border-white ring-4 ring-slate-100"></span>

            <Card className={`border border-slate-100 border-l-4 shadow-sm ${getBlockTypeColor(block.blockType)}`}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {formatTime(block.scheduledStart)}
                    </span>
                    <span className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                      {block.durationMins} mins
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      block.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      block.status === 'SKIPPED' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {block.status}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">{block.topic.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Exam weightage: {block.topic.weightage}% | Estimated prep: {block.topic.estimatedHours} hrs
                  </p>
                </div>

                {block.status === 'PENDING' && (
                  <div className="flex items-center gap-2 self-start md:self-center">
                    {block.blockType === 'STUDY' && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
                        onClick={() => onStartBlock(block)}
                      >
                        Start Study
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSkipBlock(block.id)}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => onCompleteBlock(block.id)}
                    >
                      Done
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
