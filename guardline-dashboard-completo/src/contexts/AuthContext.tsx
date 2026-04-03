import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, type Tokens } from '../lib/api'
import type { User } from '../lib/types'

type AuthState = {
  user: User | null
  tokens: Tokens | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthState | null>(null)

const LS_KEY = 'guardline.auth.v1'

function loadStored(): { user: User; tokens: Tokens } | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as any
    if (!obj?.tokens?.accessToken || !obj?.tokens?.refreshToken) return null
    return { user: obj.user as User, tokens: obj.tokens as Tokens }
  } catch {
    return null
  }
}

function store(user: User, tokens: Tokens) {
  localStorage.setItem(LS_KEY, JSON.stringify({ user, tokens }))
}

function clearStore() {
  localStorage.removeItem(LS_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<Tokens | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<Promise<string | null> | null>(null)

  useEffect(() => {
    const stored = loadStored()
    if (stored) {
      setUser(stored.user)
      setTokens(stored.tokens)
    }
    setLoading(false)
  }, [])

  const logout = () => {
    setUser(null)
    setTokens(null)
    clearStore()
  }

  const login = async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await api.auth.login(email, password)
    const nextTokens = { accessToken, refreshToken }
    setUser(user)
    setTokens(nextTokens)
    store(user, nextTokens)
  }

  const getAccessToken = async () => {
    if (!tokens?.accessToken || !tokens?.refreshToken) return null
    if (refreshing) return refreshing

    const p = (async () => {
      try {
        const { accessToken, user } = await api.auth.refresh(tokens.refreshToken)
        const nextTokens = { ...tokens, accessToken }
        setTokens(nextTokens)
        setUser(user)
        store(user, nextTokens)
        return accessToken
      } catch {
        logout()
        return null
      } finally {
        setRefreshing(null)
      }
    })()

    setRefreshing(p)
    return p
  }

  const value = useMemo<AuthState>(
    () => ({ user, tokens, loading, login, logout, getAccessToken }),
    [user, tokens, loading, refreshing],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthContext ausente')
  return ctx
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
