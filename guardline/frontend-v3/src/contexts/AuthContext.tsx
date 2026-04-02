import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

interface User {
  id: string
  email: string
  name?: string
  role: 'admin' | 'user' | 'viewer'
  modules: string[]
}

interface AuthContextType {
  user: User | null
  isNew: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isNew: false,
  loading: true,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('gl_token')
    if (!token) { setLoading(false); return }
    // Validate token by fetching KPIs
    api.get<{ active_deals?: number }>('/api/dashboard/kpis')
      .then((data) => {
        // Reconstruct minimal user from token payload
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUser({
            id: payload.sub || payload.id || 'user',
            email: payload.email || '',
            name: payload.name,
            role: payload.role || 'user',
            modules: payload.modules || [],
          })
          setIsNew(!data?.active_deals || data.active_deals === 0)
        } catch {
          setUser({ id: 'user', email: '', role: 'user', modules: [] })
        }
      })
      .catch(() => { localStorage.removeItem('gl_token') })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ accessToken?: string; token?: string; user?: User }>(
      '/api/auth/login',
      { email, password }
    )
    const token = data.accessToken || data.token || ''
    localStorage.setItem('gl_token', token)
    if (data.user) {
      setUser(data.user)
    } else {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.sub || 'user', email, role: payload.role || 'user', modules: payload.modules || [] })
      } catch {
        setUser({ id: 'user', email, role: 'user', modules: [] })
      }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('gl_token')
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, isNew, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [user, loading, navigate])
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8' }}>Loading...</div>
  return <>{children}</>
}
