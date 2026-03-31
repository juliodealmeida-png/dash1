const BASE = (() => {
  const w = typeof window !== 'undefined' ? (window as any) : {}
  const raw =
    (import.meta as any)?.env?.VITE_API_BASE ||
    w.__GUARDLINE_API_BASE__ ||
    '/api'
  return String(raw || '/api').replace(/\/$/, '')
})()

function getToken(): string | null {
  return localStorage.getItem('guardline_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('guardline_token')
    localStorage.removeItem('guardline_user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  }

  return data
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

export function fmtCurrency(value: number, locale = 'en-US'): string {
  if (value >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)
    return `$${(value / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function fmtDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function daysSince(date: string | Date): number {
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  )
}

export function healthColor(days: number, riskScore = 0): 'green' | 'yellow' | 'red' {
  if (riskScore >= 75 || days > 21) return 'red'
  if (riskScore >= 50 || days > 10) return 'yellow'
  return 'green'
}
