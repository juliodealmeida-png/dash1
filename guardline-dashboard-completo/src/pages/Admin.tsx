import { useEffect, useMemo, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { AdminApproval, User } from '../lib/types'
import { safeJsonParse } from '../lib/parsers'
import { useAuth } from '../contexts/AuthContext'

export default function Admin() {
  const { getAccessToken, user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [approvals, setApprovals] = useState<AdminApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [codeById, setCodeById] = useState<Record<string, string>>({})

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const [u, a] = await Promise.all([api.admin.users(token), api.admin.approvals(token)])
      setUsers(u)
      setApprovals(a)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar admin')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const isAdmin = user?.role === 'admin'

  const onUpdateModules = async (u: User, modulesCsv: string) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const modules = modulesCsv
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const updated = await api.admin.updateUserModules(token, u.id, modules.length ? modules : null)
      setUsers(prev => prev.map(x => (x.id === u.id ? updated : x)))
    } catch (e: any) {
      setErr(e?.message || 'Falha ao atualizar módulos')
    }
  }

  const onApprove = async (a: AdminApproval) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const code = (codeById[a.id] || '').trim()
      await api.admin.approve(token, a.id, code)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha ao aprovar')
    }
  }

  const onReject = async (a: AdminApproval) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.admin.reject(token, a.id)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha ao rejeitar')
    }
  }

  const pendingCount = useMemo(() => approvals.filter(a => a.status === 'pending').length, [approvals])

  if (!isAdmin) {
    return (
      <Section title="Admin">
        <div style={{ color: '#94a3b8' }}>Acesso restrito (admin).</div>
      </Section>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Admin" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <div style={{ color: '#94a3b8', fontSize: 12 }}>Pending approvals: <strong style={{ color: '#e5e7eb' }}>{pendingCount}</strong></div>
      </Section>

      <Section title="Users (modules)">
        <Table
          columns={[
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'company', label: 'Company', render: (u: User) => u.company ?? '' },
            { key: 'modules', label: 'Modules', render: (u: User) => {
              const arr = safeJsonParse<string[]>(u.modules, [])
              return Array.isArray(arr) ? arr.join(', ') : String(u.modules ?? '')
            } },
            { key: 'edit', label: 'Edit', render: (u: User) => (
              <input
                defaultValue={Array.isArray(safeJsonParse<string[]>(u.modules, [])) ? safeJsonParse<string[]>(u.modules, []).join(', ') : String(u.modules ?? '')}
                onBlur={e => onUpdateModules(u, e.target.value)}
                style={inputStyle}
                placeholder="mod1, mod2"
              />
            ) },
          ]}
          rows={users}
        />
      </Section>

      <Section title="Approvals (pending)">
        <Table
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'user', label: 'User', render: (a: AdminApproval) => a.user?.email ?? a.userId },
            { key: 'createdAt', label: 'Created', render: (a: AdminApproval) => (a.createdAt || '').slice(0, 19).replace('T', ' ') },
            { key: 'code', label: 'Code', render: (a: AdminApproval) => (
              <input
                value={codeById[a.id] || ''}
                onChange={e => setCodeById(prev => ({ ...prev, [a.id]: e.target.value }))}
                style={inputStyle}
                placeholder="approval code"
              />
            ) },
            { key: 'actions', label: 'Actions', render: (a: AdminApproval) => (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => onApprove(a)} style={{ height: 30, padding: '0 10px' }}>
                  Approve
                </button>
                <button className="btn" onClick={() => onReject(a)} style={{ height: 30, padding: '0 10px' }}>
                  Reject
                </button>
              </div>
            ) },
          ]}
          rows={approvals.filter(a => a.status === 'pending')}
        />
      </Section>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 30,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 10px',
  outline: 'none',
  width: '100%',
}
