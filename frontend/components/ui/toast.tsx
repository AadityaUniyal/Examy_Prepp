'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    // Return a no-op when used outside provider (SSR safety)
    return {
      toast: (_opts: Omit<Toast, 'id'>) => {},
    }
  }
  return {
    toast: context.addToast,
  }
}

const variantStyles = {
  default: 'border-surface-300 bg-surface-100',
  success: 'border-success-500/30 bg-success-500/10',
  error: 'border-danger-500/30 bg-danger-500/10',
  warning: 'border-warning-500/30 bg-warning-500/10',
}

const variantIcons = {
  default: '💡',
  success: '✓',
  error: '✕',
  warning: '⚠',
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast.duration, onRemove])

  return (
    <div
      className={cn(
        'animate-slide-in-right pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-glass backdrop-blur-xl',
        variantStyles[toast.variant || 'default']
      )}
      role="alert"
    >
      <span className="mt-0.5 text-lg leading-none">
        {variantIcons[toast.variant || 'default']}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-txt-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs text-txt-secondary">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 text-txt-muted hover:text-txt-primary transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Re-export a standalone toast function for use outside React tree
let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function setGlobalToastFn(fn: (toast: Omit<Toast, 'id'>) => void) {
  globalAddToast = fn
}

export function toast(opts: Omit<Toast, 'id'>) {
  if (globalAddToast) globalAddToast(opts)
}
