import { useEffect, useMemo, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { Lead } from '../lib/types'
import { safeJsonParse } from '../lib/parsers'
import { useAuth } from '../contexts/AuthContext'
import { useFilters } from '../contexts/FiltersContext'

export default function Leads() {
  const { getAccessToken } = useAuth()
  const { filters } = useFilters()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Lead[]>([])
  const [csv, setCsv] = useState('')

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const list = await api.leads.list(token, {
        search: filters.search || undefined,
        status: filters.leadStatus || undefined,
        source: filters.leadSource || undefined,
        page: 1,
        perPage: 100,
      })
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [filters.search, filters.leadStatus, filters.leadSource])

  const onEnrich = async (lead: Lead) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const updated = await api.leads.enrich(token, lead.id)
      setRows(prev => prev.map(l => (l.id === lead.id ? updated : l)))
    } catch (e: any) {
      setErr(e?.message || 'Falha no enrich')
    }
  }

  const onConvert = async (lead: Lead) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const payload = {
        title: `Deal: ${lead.company ?? lead.name}`,
        companyName: lead.company ?? lead.name,
        value: 25000,
        stage: 'Prospecting',
        probability: 20,
      }
      const out = await api.leads.convert(token, lead.id, payload)
      setRows(prev => prev.map(l => (l.id === lead.id ? { ...l, convertedDealId: out.deal.id } : l)))
    } catch (e: any) {
      setErr(e?.message || 'Falha ao converter')
    }
  }

  const onImport = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const out = await api.leads.importCsv(token, csv)
      setCsv('')
      setRows(prev => [...out.created, ...prev])
    } catch (e: any) {
      setErr(e?.message || 'Falha ao importar CSV')
    }
  }

  const hotCount = useMemo(() => rows.filter(l => (l.temperature || '').toLowerCase() === 'hot' || l.score >= 70).length, [rows])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Leads" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, color: '#94a3b8', fontSize: 12 }}>
          <div>Total: <strong style={{ color: '#e5e7eb' }}>{rows.length}</strong></div>
          <div>Hot: <strong style={{ color: '#34d399' }}>{hotCount}</strong></div>
        </div>

        <Table
          columns={[
            { key: 'company', label: 'Company', render: (l: Lead) => l.company ?? '' },
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            { key: 'score', label: 'Score' },
            { key: 'temperature', label: 'Temp' },
            { key: 'source', label: 'Source', render: (l: Lead) => l.source ?? '' },
            { key: 'nextAction', label: 'Next', render: (l: Lead) => l.nextAction ?? '' },
            { key: 'enrich', label: 'Enrich', render: (l: Lead) => (
              <button className="btn" onClick={() => onEnrich(l)} style={{ height: 30, padding: '0 10px' }}>
                Enrich
              </button>
            ) },
            { key: 'convert', label: 'Convert', render: (l: Lead) => (
              <button className="btn" onClick={() => onConvert(l)} style={{ height: 30, padding: '0 10px' }} disabled={Boolean(l.convertedDealId)}>
                {l.convertedDealId ? 'Converted' : 'Convert'}
              </button>
            ) },
            { key: 'intent', label: 'Intent', render: (l: Lead) => {
              const arr = safeJsonParse<any[]>(l.intentSignals, [])
              return Array.isArray(arr) ? arr.length : 0
            } },
            { key: 'lastActivity', label: 'Last', render: (l: Lead) => (l.lastActivity || '').slice(0, 19).replace('T', ' ') },
          ]}
          rows={rows}
        />
      </Section>

      <Section title="Import CSV (leads)" right={<button className="btn" onClick={onImport} disabled={!csv.trim()}>Import</button>}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>
          Cole o CSV bruto aqui (o backend espera {`{ csv: "..." }`}).
        </div>
        <textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          style={{ width: '100%', minHeight: 160, borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)', color: '#e5e7eb', padding: 12, outline: 'none' }}
        />
      </Section>
    </div>
  )
}

