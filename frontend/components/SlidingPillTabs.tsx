'use client'

import React, { useRef, useEffect, useState } from 'react'

interface TabOption {
  id: string
  label: string
}

interface SlidingPillTabsProps {
  tabs: TabOption[]
  activeTab: string
  onChange: (id: string) => void
}

export default function SlidingPillTabs({
  tabs,
  activeTab,
  onChange
}: SlidingPillTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({
    transform: 'translateX(0px)',
    width: '0px'
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Find the active element by custom attribute or text label
    const activeEl = container.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement
    if (activeEl) {
      setHighlightStyle({
        transform: `translateX(${activeEl.offsetLeft}px)`,
        width: `${activeEl.offsetWidth}px`,
        height: `${activeEl.offsetHeight}px`
      })
    }
  }, [activeTab, tabs])

  return (
    <div
      ref={containerRef}
      className="relative flex p-1 bg-transparent border border-slate-100 rounded-xl overflow-hidden"
    >
      {/* Sliding Highlight Pill */}
      <div
        className="absolute top-1 left-0 bg-slate-800 border border-slate-200/60 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={highlightStyle}
      />

      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative z-10 px-4 py-2 text-xs font-bold transition-colors duration-150 rounded-lg ${
            activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-[rgb(var(--text-secondary))]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
