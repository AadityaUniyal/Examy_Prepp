'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react'

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode
  centerPanel: React.ReactNode
  rightPanel: React.ReactNode
}

export default function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel
}: ThreePanelLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  const panelTransition = {
    type: 'tween',
    duration: 0.28,
    ease: [0.4, 0, 0.2, 1]
  }

  return (
    <div className="flex w-full min-height-screen bg-transparent text-white overflow-hidden relative">
      {/* LEFT PANEL */}
      <motion.div
        animate={{
          width: leftCollapsed ? 50 : 260,
          opacity: 1
        }}
        transition={panelTransition}
        className="bg-[rgb(var(--surface-0))]/80 border-r border-slate-200/80 flex-shrink-0 flex flex-col relative overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto">
          {leftCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4">
              <button onClick={() => setLeftCollapsed(false)} className="p-2 hover:bg-slate-100 rounded-lg text-[rgb(var(--text-muted))]">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="p-4">{leftPanel}</div>
          )}
        </div>

        {/* Left Collapse Button */}
        {!leftCollapsed && (
          <button
            onClick={() => setLeftCollapsed(true)}
            className="absolute top-1/2 -right-3 -translate-y-1/2 bg-slate-800 border border-slate-200 hover:bg-slate-700 text-[rgb(var(--text-secondary))] w-6 h-6 rounded-full flex items-center justify-center z-20 shadow-md"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-y-auto">
        {/* Mobile menu bar if left is collapsed */}
        {leftCollapsed && (
          <div className="p-3 border-b border-slate-100 bg-transparent flex items-center gap-2">
            <button
              onClick={() => setLeftCollapsed(false)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-[rgb(var(--text-muted))]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ExamEve Study Room</span>
          </div>
        )}
        <div className="p-6 flex-1">{centerPanel}</div>
      </div>

      {/* RIGHT PANEL */}
      <motion.div
        animate={{
          width: rightCollapsed ? 0 : 320,
          opacity: rightCollapsed ? 0 : 1
        }}
        transition={panelTransition}
        className="bg-[rgb(var(--surface-0))]/60 border-l border-slate-200/80 flex-shrink-0 flex flex-col relative overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto p-4">{rightPanel}</div>

        {/* Right Collapse Button Toggle */}
        <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="absolute top-1/2 -left-3 -translate-y-1/2 bg-slate-800 border border-slate-200 hover:bg-slate-700 text-[rgb(var(--text-secondary))] w-6 h-6 rounded-full flex items-center justify-center z-20 shadow-md"
        >
          {rightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </motion.div>
    </div>
  )
}
