'use client'

import React from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  message = "No study logs found. Start your first session to track progress!",
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[rgb(var(--surface-0))]/60 border border-slate-200/80 rounded-2xl text-center">
      <div className="p-3 bg-slate-800/50 rounded-full mb-4">
        <Inbox className="w-6 h-6 text-slate-500" />
      </div>
      <p className="text-[rgb(var(--text-muted))] text-xs mb-4 leading-relaxed max-w-xs">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
