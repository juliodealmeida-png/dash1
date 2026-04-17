import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { FraudEvent, FraudStats } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

export default function Fraud() {
  const { getAccessToken } = useAuth()
  const [stats, setStats] = useState<FraudStats | null>(null)
  const [events, setEvents] = useState<FraudEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const [s, list] = await Promise.all([api.fraud.stats(token), api.fraud.list(token, { page: 1, perPage: 200 })])
      setStats(s)
      setEvents(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar fraude')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const center = useMemo(() => {
    const first = events.find(e => Number.isFinite(e.lat) && Number.isFinite(e.lng))
    return first ? ([first.lat, first.lng] as [number, number]) : ([0, 0] as [number, number])
  }, [events])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Fraud" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}

        {stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={pill}>Total: <strong>{stats.total}</strong></div>
            <div style={pill}>Today: <strong>{stats.fraudToday}</strong></div>
            <div style={pill}>Amount: <strong>{stats.amountTotal.toLocaleString()}</strong></div>
            <div style={pill}>Severities: <strong>{stats.bySeverity.length}</strong></div>
            <div style={pill}>Statuses: <strong>{stats.byStatus.length}</strong></div>
          </div>
        ) : null}
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        <Section title="Fraud Map">
          <div style={{ height: 420, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <MapContainer center={center} zoom={2} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {events
                .filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng))
                .slice(0, 800)
                .map(e => {
                  const color = e.severity === 'critical' ? '#ef4444' : e.severity === 'high' ? '#f59e0b' : '#60a5fa'
                  const radius = Math.max(4, Math.min(16, Math.round((e.riskScore || 0) / 8)))
                  return (
                    <CircleMarker key={e.id} center={[e.lat, e.lng]} radius={radius} pathOptions={{ color, fillColor: color, fillOpacity: 0.35 }}>
                      <LeafletTooltip>
                        <div>
                          <div><strong>{e.type}</strong> ({e.severity}/{e.status})</div>
                          <div>Risk: {e.riskScore} Amount: {e.amount} {e.currency}</div>
                          <div>{(e.detectedAt || '').slice(0, 19).replace('T', ' ')}</div>
                        </div>
                      </LeafletTooltip>
                    </CircleMarker>
                  )
                })}
            </MapContainer>
          </div>
        </Section>

        <Section title="Fraud Events">
          <Table
            columns={[
              { key: 'detectedAt', label: 'Detected', render: (e: FraudEvent) => (e.detectedAt || '').slice(0, 19).replace('T', ' ') },
              { key: 'severity', label: 'Severity' },
              { key: 'status', label: 'Status' },
              { key: 'type', label: 'Type' },
              { key: 'riskScore', label: 'Risk' },
              { key: 'amount', label: 'Amount', render: (e: FraudEvent) => `${e.amount} ${e.currency}` },
              { key: 'country', label: 'Country', render: (e: FraudEvent) => e.country ?? '' },
            ]}
            rows={events}
          />
        </Section>
      </div>
    </div>
  )
}

const pill: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  padding: '10px 12px',
  borderRadius: 14,
  color: '#cbd5e1',
  fontSize: 13,
}
