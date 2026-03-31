import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'loading'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    
    if (type !== 'loading') {
      setTimeout(() => dismiss(id), 5000)
    }
    
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-md px-4">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border animate-slide-up ${
              t.type === 'success' ? 'bg-accent-green/10 border-accent-green/20 text-accent-green' :
              t.type === 'error' ? 'bg-accent-red/10 border-accent-red/20 text-accent-red' :
              t.type === 'loading' ? 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple' :
              'bg-card border-border text-text-primary'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            {t.type === 'loading' && <Loader2 size={18} className="animate-spin" />}
            
            <span className="text-sm font-bold flex-1">{t.message}</span>
            
            <button onClick={() => dismiss(t.id)} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
