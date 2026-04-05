/// <reference types="vite/client" />
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
/// <reference types="vite/client" />
const API_BASE = (import.meta.env.VITE_API_BASE as string) || ''

type EventHandler = (data: unknown) => void

interface SocketContextType {
  on: (event: string, handler: EventHandler) => () => void
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({
  on: () => () => {},
  connected: false,
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('gl_token')
    const url = `${API_BASE}/api/realtime/stream${token ? `?token=${token}` : ''}`

    function connect() {
      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => setConnected(true)
      es.onerror = () => {
        setConnected(false)
        es.close()
        setTimeout(connect, 5000)
      }

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          const handlers = handlersRef.current.get(msg.type)
          if (handlers) handlers.forEach((h) => h(msg.data))
          // Also emit 'any' event
          const anyHandlers = handlersRef.current.get('*')
          if (anyHandlers) anyHandlers.forEach((h) => h(msg))
        } catch {/* ignore */}
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [])

  function on(event: string, handler: EventHandler) {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set())
    handlersRef.current.get(event)!.add(handler)
    return () => handlersRef.current.get(event)?.delete(handler)
  }

  return (
    <SocketContext.Provider value={{ on, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
