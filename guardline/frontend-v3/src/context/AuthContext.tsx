import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  company?: string
  modules?: string | null
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('guardline_token')
    const storedUser = localStorage.getItem('guardline_user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('guardline_token')
        localStorage.removeItem('guardline_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password })
    const accessToken =
      res?.accessToken ||
      res?.token ||
      res?.data?.accessToken ||
      res?.data?.token ||
      null
    const userObj = res?.user || res?.data?.user || null

    if (!accessToken || !userObj) throw new Error('Resposta de login inválida')

    localStorage.setItem('guardline_token', accessToken)
    localStorage.setItem('guardline_user', JSON.stringify(userObj))
    setToken(accessToken)
    setUser(userObj)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('guardline_token')
    localStorage.removeItem('guardline_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
