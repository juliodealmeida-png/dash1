import React, { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  msg: string
  type: ToastType
}

interface ToastContextType {
  toast: (msg: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((msg: string, type: ToastType = 'info') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, msg, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const colorMap = { success: '#34d399', error: '#f87171', info: '#06b6d4' }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: '#1e293b',
              border: `1px solid ${colorMap[t.type]}40`,
              borderLeft: `3px solid ${colorMap[t.type]}`,
              color: '#f1f5f9',
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 13,
              minWidth: 240,
              maxWidth: 360,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.2s ease',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
