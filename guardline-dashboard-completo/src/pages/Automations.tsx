import { useEffect, useMemo, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { AutomationLog, AutomationRecipe } from '../lib/types'
import { safeJsonParse } from '../lib/parsers'
import { useAuth } from '../contexts/AuthContext'

export default function Automations() {
  const { getAccessToken } = useAuth()
  const [recipes, setRecipes] = useState<AutomationRecipe[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [recipeId, setRecipeId] = useState('')
  const [dealId, setDealId] = useState('')
  const [leadId, setLeadId] = useState('')

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const [r, l] = await Promise.all([api.automations.recipes(token), api.automations.logs(token, 150)])
      setRecipes(r)
      setLogs(l)
      if (!recipeId && r[0]?.id) setRecipeId(r[0].id)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar automations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const activeCount = useMemo(() => recipes.filter(r => r.active).length, [recipes])
  const errorCount = useMemo(() => logs.filter(l => (l.status || '').toLowerCase().includes('error') || (l.status || '').toLowerCase().includes('fail')).length, [logs])

  const onTrigger = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      if (!recipeId) throw new Error('Selecione um recipe')
      await api.automations.trigger(token, { recipeId, dealId: dealId || undefined, leadId: leadId || undefined, source: 'dashboard' })
      setDealId('')
      setLeadId('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha ao disparar')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Automations (Recipes)" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <div style={{ display: 'flex', gap: 12, color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
          <div>Total: <strong style={{ color: '#e5e7eb' }}>{recipes.length}</strong></div>
          <div>Active: <strong style={{ color: '#34d399' }}>{activeCount}</strong></div>
          <div>Errors (logs): <strong style={{ color: '#fca5a5' }}>{errorCount}</strong></div>
        </div>
        <Table
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'trigger', label: 'Trigger' },
            { key: 'active', label: 'Active', render: (r: AutomationRecipe) => (r.active ? 'yes' : 'no') },
            { key: 'timesActivated', label: 'Times' },
            { key: 'lastActivated', label: 'Last', render: (r: AutomationRecipe) => (r.lastActivated || '').slice(0, 19).replace('T', ' ') },
            { key: 'actions', label: 'Actions (count)', render: (r: AutomationRecipe) => {
              const arr = safeJsonParse<any[]>(r.actions, [])
              return Array.isArray(arr) ? arr.length : 0
            } },
          ]}
          rows={recipes}
        />
      </Section>

      <Section
        title="Trigger recipe"
        right={
          <button className="btn" onClick={onTrigger} disabled={!recipeId}>
            Trigger
          </button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            Recipe
            <select value={recipeId} onChange={e => setRecipeId(e.target.value)} style={inputStyle}>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            Deal ID (optional)
            <input value={dealId} onChange={e => setDealId(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            Lead ID (optional)
            <input value={leadId} onChange={e => setLeadId(e.target.value)} style={inputStyle} />
          </label>
        </div>
      </Section>

      <Section title="Automation Logs">
        <Table
          columns={[
            { key: 'createdAt', label: 'Created', render: (l: AutomationLog) => (l.createdAt || '').slice(0, 19).replace('T', ' ') },
            { key: 'status', label: 'Status' },
            { key: 'recipe', label: 'Recipe', render: (l: AutomationLog) => l.recipe?.name || l.recipeId },
            { key: 'deal', label: 'Deal', render: (l: AutomationLog) => l.deal?.companyName || l.dealId || '' },
            { key: 'duration', label: 'ms', render: (l: AutomationLog) => l.duration ?? '' },
            { key: 'errorMessage', label: 'Error', render: (l: AutomationLog) => l.errorMessage ?? '' },
          ]}
          rows={logs}
        />
      </Section>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 10px',
  outline: 'none',
}
