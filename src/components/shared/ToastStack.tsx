import { useState, useCallback, useEffect } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'fail' | 'info'
}

let toastId = 0
const listeners: Array<(toast: Toast) => void> = []

// Global toast function — call from anywhere
export function showToast(message: string, type: Toast['type'] = 'info') {
  const toast: Toast = { id: toastId++, message, type }
  listeners.forEach(fn => fn(toast))
}

export function ToastStack() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Toast) => {
    setToasts(prev => [toast, ...prev].slice(0, 5))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, 2000)
  }, [])

  useEffect(() => {
    listeners.push(addToast)
    return () => {
      const idx = listeners.indexOf(addToast)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }, [addToast])

  return (
    <div className="fixed top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            px-3 py-2 rounded text-sm font-medium shadow-lg
            transition-all duration-200
            ${t.type === 'success' ? 'bg-accent/20 text-accent border border-accent/30' : ''}
            ${t.type === 'fail' ? 'bg-danger/20 text-danger border border-danger/30' : ''}
            ${t.type === 'info' ? 'bg-surface-2 text-text border border-border' : ''}
          `}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
