import { useEffect, useMemo, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { Deal, PipelineStats } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'
import { useFilters } from '../contexts/FiltersContext'

function money(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function Deals() {
  const { getAccessToken } = useAuth()
  const { filters } = useFilters()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Deal[]>([])
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null)
  const stages = useMemo(() => pipeline?.byStage.map(s => s.stage) ?? [], [pipeline])

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const [list, stats] = await Promise.all([
        api.deals.list(token, { search: filters.search || undefined, stage: filters.dealStage || undefined, page: 1, perPage: 100 }),
        api.deals.pipelineStats(token),
      ])
      setRows(list)
      setPipeline(stats)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar deals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [filters.search, filters.dealStage])

  const onStageChange = async (deal: Deal, stage: string) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const updated = await api.deals.setStage(token, deal.id, stage)
      setRows(prev => prev.map(d => (d.id === deal.id ? updated : d)))
    } catch (e: any) {
      setErr(e?.message || 'Falha ao mover deal')
    }
  }

  const onRecalcRisk = async (deal: Deal) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const out = await api.deals.setRisk(token, deal.id)
      setRows(prev => prev.map(d => (d.id === deal.id ? out.deal : d)))
    } catch (e: any) {
      setErr(e?.message || 'Falha ao recalcular risco')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section
        title="Deals"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={filters.dealStage}
              onChange={() => {}}
              style={{ height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.10)', padding: '0 10px' }}
              disabled
            >
              <option value="">Filtro global no topo</option>
            </select>
            <button className="btn" onClick={refresh}>
              Refresh
            </button>
          </div>
        }
      >
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <Table
          columns={[
            { key: 'companyName', label: 'Company' },
            { key: 'title', label: 'Deal' },
            { key: 'value', label: 'Value', render: (d: Deal) => money(d.value) },
            { key: 'stage', label: 'Stage', render: (d: Deal) => (
              <select
                value={d.stage}
                onChange={e => onStageChange(d, e.target.value)}
                style={{ height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.10)', padding: '0 10px' }}
              >
                {(stages.length ? stages : ['Prospecting', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost']).map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) },
            { key: 'probability', label: 'Prob', render: (d: Deal) => `${d.probability}%` },
            { key: 'riskScore', label: 'Risk', render: (d: Deal) => (
              <button className="btn" onClick={() => onRecalcRisk(d)} style={{ height: 30, padding: '0 10px' }}>
                {d.riskScore}
              </button>
            ) },
            { key: 'daysInStage', label: 'Days in stage', render: (d: Deal) => d.daysInStage ?? '' },
            { key: 'daysSinceContact', label: 'Days since contact', render: (d: Deal) => d.daysSinceContact ?? '' },
          ]}
          rows={rows}
        />
      </Section>
    </div>
  )
}

