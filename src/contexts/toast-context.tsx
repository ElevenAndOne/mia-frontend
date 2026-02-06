import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  duration: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (variant: ToastVariant, message: string, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 5000

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutRefs = useRef<Map<string, number>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const timeoutId = timeoutRefs.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutRefs.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((variant: ToastVariant, message: string, duration = DEFAULT_DURATION) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const toast: Toast = { id, variant, message, duration }

    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        dismissToast(id)
      }, duration)
      timeoutRefs.current.set(id, timeoutId)
    }
  }, [dismissToast])

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- useToast hook must be co-located with ToastProvider
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
