import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

type RealtimeEvent = { event: string; payload: unknown; at: number }

type RealtimeState = {
  connected: boolean
  lastEvents: RealtimeEvent[]
  subscribe: (handler: (e: RealtimeEvent) => void) => () => void
}

const RealtimeContext = createContext<RealtimeState | null>(null)

const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL ?? ''

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { tokens } = useAuth()
  const [connected, setConnected] = useState(false)
  const [lastEvents, setLastEvents] = useState<RealtimeEvent[]>([])
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(new Set<(e: RealtimeEvent) => void>())

  useEffect(() => {
    if (!tokens?.accessToken) return

    const socket = io(SOCKET_URL || '/', {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: tokens.accessToken },
    })

    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    const attachWildcard = () => {
      const anyHandler = (event: string, payload: unknown) => {
        const e: RealtimeEvent = { event, payload, at: Date.now() }
        setLastEvents(prev => [e, ...prev].slice(0, 50))
        handlersRef.current.forEach(h => h(e))
      }
      socket.onAny(anyHandler)
      return () => socket.offAny(anyHandler)
    }

    const detachAny = attachWildcard()

    return () => {
      detachAny()
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [tokens?.accessToken])

  const subscribe = (handler: (e: RealtimeEvent) => void) => {
    handlersRef.current.add(handler)
    return () => handlersRef.current.delete(handler)
  }

  const value = useMemo<RealtimeState>(() => ({ connected, lastEvents, subscribe }), [connected, lastEvents])

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('RealtimeContext ausente')
  return ctx
}
