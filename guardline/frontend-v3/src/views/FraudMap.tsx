import { useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar'
import { api } from '../lib/api'

type Period = '24h' | '7d' | '15d' | '30d'
type Country = '' | 'BR' | 'MX' | 'AR' | 'CO' | 'CL' | 'PE'

type Feature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: Record<string, unknown>
}

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Feature[]
}

type FraudLayersResponse = {
  layers: {
    lead_risk: FeatureCollection
    signal: FeatureCollection
    threat_intel: FeatureCollection
  }
  stats: {
    total_events: number
    total_leads_at_risk: number
    total_value_at_risk: number
    blocked_count: number
    countries_affected: number
  }
  generated_at: string
}

function proj(lng: number, lat: number, w: number, h: number) {
  const x = ((lng + 180) / 360) * w
  const y = ((90 - lat) / 180) * h
  return { x, y }
}

function pickDate(p: Record<string, unknown>): string {
  const v = p.created_at || p.published_at || p.processed_at || p.updated_at || p.createdAt || p.publishedAt
  if (!v) return ''
  return String(v)
}

function pickTitle(p: Record<string, unknown>): string {
  return String(p.title || p.fraud_type || p.type || p.account || p.company_name || 'Evento')
}

export default function FraudMap() {
  const [period, setPeriod] = useState<Period>('15d')
  const [country, setCountry] = useState<Country>('')
  const [data, setData] = useState<FraudLayersResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      q.set('period', period)
      q.set('layer', 'all')
      if (country) q.set('country', country)
      const res = await api.get<FraudLayersResponse>(`/fraud-map/layers?${q.toString()}`)
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [country, period])

  useEffect(() => {
    load()
  }, [load])

  const points = useMemo(() => {
    if (!data) return []
    const all = [
      ...(data.layers.signal.features || []),
      ...(data.layers.threat_intel.features || []),
      ...(data.layers.lead_risk.features || []),
    ]
    const rows = all
      .map((f) => {
        const p = (f.properties || {}) as Record<string, unknown>
        const [lng, lat] = f.geometry.coordinates
        const when = pickDate(p)
        return {
          id: String(p.id || `${lng},${lat}`),
          layer: String((p._layer as string) || ''),
          lat,
          lng,
          country: String(p.country || p.company_country || ''),
          city: String(p.city || ''),
          title: pickTitle(p),
          when,
          amount: Number(p.amount || 0),
          severity: String(p.severity || ''),
        }
      })
      .sort((a, b) => String(b.when).localeCompare(String(a.when)))
    return rows.slice(0, 120)
  }, [data])

  const svg = useMemo(() => {
    const w = 900
    const h = 420
    const circles = points
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => {
        const { x, y } = proj(p.lng, p.lat, w, h)
        const r = p.layer === 'signal' ? 4 : p.layer === 'threat_intel' ? 3 : 2.5
        const c =
          p.layer === 'signal' ? '#f59e0b' : p.layer === 'threat_intel' ? '#06b6d4' : '#7c3aed'
        return <circle key={`${p.id}-${p.layer}`} cx={x} cy={y} r={r} fill={c} fillOpacity={0.75} />
      })
    return { w, h, circles }
  }, [points])

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Fraud Map" subtitle="15 dias · sinais + threat intel + leads" onRefresh={load} />
      <div className="p-5 space-y-4 animate-fade-in">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="card flex items-center gap-3">
            <div className="text-xs text-text-muted">Period</div>
            <select className="input text-xs" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="15d">15d</option>
              <option value="30d">30d</option>
            </select>
          </div>
          <div className="card flex items-center gap-3">
            <div className="text-xs text-text-muted">Country</div>
            <select className="input text-xs" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              <option value="">All</option>
              <option value="BR">BR</option>
              <option value="MX">MX</option>
              <option value="AR">AR</option>
              <option value="CO">CO</option>
              <option value="CL">CL</option>
              <option value="PE">PE</option>
            </select>
          </div>
          {data?.stats && (
            <>
              <div className="card">
                <div className="text-xs text-text-muted">Events</div>
                <div className="text-xl font-extrabold text-text-primary mt-1">{data.stats.total_events}</div>
              </div>
              <div className="card">
                <div className="text-xs text-text-muted">Value at risk</div>
                <div className="text-xl font-extrabold text-accent-amber mt-1">
                  ${Math.round(data.stats.total_value_at_risk || 0).toLocaleString()}
                </div>
              </div>
              <div className="card">
                <div className="text-xs text-text-muted">Countries</div>
                <div className="text-xl font-extrabold text-text-primary mt-1">{data.stats.countries_affected}</div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div className="text-sm font-semibold text-text-primary">Map (simple projection)</div>
              <div className="text-xs text-text-muted">{points.length} points</div>
            </div>
            <div className="p-3">
              {loading ? (
                <div className="text-xs text-text-muted">Loading...</div>
              ) : !data ? (
                <div className="text-xs text-text-muted">No data</div>
              ) : (
                <svg
                  viewBox={`0 0 ${svg.w} ${svg.h}`}
                  className="w-full h-[340px] bg-surface border border-border-subtle rounded-lg"
                >
                  <rect x="0" y="0" width={svg.w} height={svg.h} fill="rgba(15,18,32,1)" />
                  {svg.circles}
                </svg>
              )}
            </div>
            <div className="px-4 pb-4 flex flex-wrap gap-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-amber" />signal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-cyan" />threat_intel</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-purple" />lead_risk</span>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div className="text-sm font-semibold text-text-primary">Latest events</div>
              <div className="text-xs text-text-muted">{country || 'all'}</div>
            </div>
            <div className="divide-y divide-border-subtle">
              {loading ? (
                <div className="p-6 text-xs text-text-muted">Loading...</div>
              ) : !points.length ? (
                <div className="p-6 text-xs text-text-muted">No events</div>
              ) : (
                points.slice(0, 30).map((p) => (
                  <div key={`${p.id}-${p.layer}`} className="px-4 py-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-text-primary truncate">{p.title}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {p.layer || '—'} · {p.city || '—'} {p.country ? `· ${p.country}` : ''} ·{' '}
                        {p.when ? new Date(p.when).toLocaleString() : '—'}
                      </div>
                    </div>
                    {p.amount ? (
                      <div className="text-[10px] text-accent-amber shrink-0">
                        ${Math.round(p.amount).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

