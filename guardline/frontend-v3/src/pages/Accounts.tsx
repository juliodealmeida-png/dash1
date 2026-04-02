import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

interface Account {
  company: string
  leadCount: number
  avgScore: number
  lastActivity?: string
  totalValue?: number
  sector?: string
}

function fmt(n?: number, prefix = '') {
  if (n === undefined || n === null) return '—'
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n}`
}

const SCORE_COLOR = (s?: number) => {
  if (!s) return '#64748b'
  if (s >= 70) return '#34d399'
  if (s >= 40) return '#fbbf24'
  return '#f87171'
}

export default function Accounts() {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<Account[] | { data?: Account[] }>('/api/accounts')
      .then((d) => setAccounts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter((a) =>
    !search || a.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{t('sidebar.accounts') || 'Contas'}</h1>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{accounts.length} contas agrupadas por empresa</div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresa..."
          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#f1f5f9', fontSize: 13, outline: 'none', width: 220 }}
        />
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>{t('common.loading')}</div>}
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      {!loading && !error && filtered.length === 0 && <div style={{ color: '#64748b' }}>{t('common.empty')}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filtered.map((a, i) => (
          <div key={i} style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>{a.company || '—'}</div>
            {a.sector && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{a.sector}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Leads</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{a.leadCount ?? 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Avg Score</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: SCORE_COLOR(a.avgScore) }}>{a.avgScore ?? 0}</div>
              </div>
              {a.totalValue !== undefined && (
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Pipeline</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#06b6d4' }}>{fmt(a.totalValue, '$')}</div>
                </div>
              )}
              {a.lastActivity && (
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Última atividade</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>{a.lastActivity}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
