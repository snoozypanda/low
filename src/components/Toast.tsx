import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from './ui'
import type { Toast } from '../types'

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((items) => items.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((items) => [...items.slice(-2), { ...toast, id }])
      window.setTimeout(() => {
        setToasts((items) => items.filter((item) => item.id !== id))
      }, 3800)
    },
    [],
  )

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

const tones = {
  success: {
    icon: CheckCircle2,
    wrap: 'border-[#CFE7C5] bg-white',
    iconWrap: 'bg-brand-tint text-brand-dark',
    title: 'text-ink',
  },
  error: {
    icon: AlertCircle,
    wrap: 'border-[#F4CDD4] bg-white',
    iconWrap: 'bg-[#FDECEF] text-accent',
    title: 'text-ink',
  },
  warning: {
    icon: TriangleAlert,
    wrap: 'border-[#F2DFB8] bg-white',
    iconWrap: 'bg-[#FFF5E6] text-[#9A5B00]',
    title: 'text-ink',
  },
  info: {
    icon: Info,
    wrap: 'border-[#CFE0F7] bg-white',
    iconWrap: 'bg-[#EAF2FF] text-[#1D5FB8]',
    title: 'text-ink',
  },
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[300] flex flex-col items-center gap-2 px-3 sm:left-1/2 sm:right-auto sm:w-[360px] sm:-translate-x-1/2">
      {toasts.map((toast) => {
        const tone = tones[toast.tone]
        const Icon = tone.icon
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-float animate-pop',
              tone.wrap,
            )}
            role="status"
          >
            <div className={cn('flex h-7 w-7 flex-none items-center justify-center rounded-full', tone.iconWrap)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn('text-[12px] font-bold leading-snug', tone.title)}>{toast.title}</p>
              {toast.message ? (
                <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{toast.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-ink-soft hover:bg-page hover:text-ink"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
