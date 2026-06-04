'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Search } from 'lucide-react'

interface CommandAction {
  name: string
  shortcut: string
  action: () => void
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const actions: CommandAction[] = [
    { name: 'Start Timer / Focus Session', shortcut: 'Space', action: () => console.log('Action: Start timer') },
    { name: 'View Performance Analytics', shortcut: 'Progress Tab', action: () => console.log('Action: Show analytics') },
    { name: 'Generate Study Plan', shortcut: 'Plan Tab', action: () => console.log('Action: Generate plan') },
    { name: 'Trigger Breathing Exercise', shortcut: 'Panic Tab', action: () => console.log('Action: Trigger panic recovery') }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isOpen) return null

  const filtered = actions.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 transition-opacity">
      <Card className="max-w-lg w-full bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="flex items-center border-b border-slate-800 px-4 py-3 gap-3">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-white placeholder-slate-500 text-sm focus:outline-none w-full"
          />
          <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-bold px-2 py-0.5 rounded-md">ESC</span>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">No commands match your query.</p>
          ) : (
            filtered.map((act, index) => (
              <button
                key={index}
                onClick={() => {
                  act.action()
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/80 flex justify-between items-center transition-all active:scale-[0.99]"
              >
                <span className="text-xs font-bold text-slate-200">{act.name}</span>
                <span className="text-[10px] text-slate-500 font-bold font-mono uppercase">{act.shortcut}</span>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
