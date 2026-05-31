import { create } from 'zustand'

export interface Topic {
  id: string
  name: string
  weightage: number
  complexityScore: number
  estimatedHours: number
  confidence?: {
    selfScore: number
    calibratedScore: number
  }
}

export interface PlanBlock {
  id: string
  topic: Topic
  scheduledStart: string
  durationMins: number
  blockType: 'STUDY' | 'QUIZ' | 'REVISION' | 'BREAK'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  priorityRank: number
}

export interface StudyPlan {
  id: string
  planType: string
  totalHours: number
  isActive: boolean
  blocks: PlanBlock[]
}

interface PlanState {
  plan: StudyPlan | null
  activeBlock: PlanBlock | null
  activeSessionId: string | null
  timerRunning: boolean
  secondsElapsed: number
  panicMode: boolean
  setPlan: (plan: StudyPlan | null) => void
  setActiveBlock: (block: PlanBlock | null) => void
  setActiveSessionId: (id: string | null) => void
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  tickTimer: () => void
  setPanicMode: (panic: boolean) => void
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  activeBlock: null,
  activeSessionId: null,
  timerRunning: false,
  secondsElapsed: 0,
  panicMode: false,
  setPlan: (plan) => set({ plan }),
  setActiveBlock: (block) => set({ activeBlock: block }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  startTimer: () => set({ timerRunning: true }),
  stopTimer: () => set({ timerRunning: false }),
  resetTimer: () => set({ secondsElapsed: 0 }),
  tickTimer: () => set((state) => ({ secondsElapsed: state.secondsElapsed + 1 })),
  setPanicMode: (panic) => set({ panicMode: panic }),
}))
