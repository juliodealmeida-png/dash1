import { useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar'
import { api } from '../lib/api'

type Campaign = {
  id: string
  name: string
  type: string
  status: string
  startDate: string
  endDate?: string | null
  budget?: number | null
  targetLeads?: number | null
  _count?: { leads?: number }
}

function toIsoDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

export default function Campaigns() {
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('linkedin')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Campaign[] }>('/campaigns?perPage=100')
      setItems(res.data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter((c) => String(c.status).toLowerCase() === 'active').length
    return { total, active }
  }, [items])

  async function toggle(c: Campaign) {
    const isActive = String(c.status).toLowerCase() === 'active'
    const nextActive = !isActive
    setItems((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, status: nextActive ? 'active' : 'paused' } : x))
    )
    try {
      await api.post<{ data: Campaign }>(`/campaigns/${encodeURIComponent(c.id)}/toggle`, { active: nextActive })
    } catch {
      await load()
    }
  }

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    try {
      await api.post<{ data: Campaign }>('/campaigns', {
        name: name.trim(),
        type: type.trim(),
        startDate: toIsoDate(startDate),
        status: 'active',
      })
      setName('')
      setType('linkedin')
      setStartDate(new Date().toISOString().slice(0, 10))
      await load()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Campaigns" subtitle={`${stats.active}/${stats.total} active`} onRefresh={load} />
      <div className="p-5 space-y-4 animate-fade-in">
        <div className="card">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-text-muted">Name</label>
              <input className="input mt-1 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs text-text-muted">Type</label>
              <select className="input mt-1 text-xs" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="linkedin">LinkedIn</option>
                <option value="cold_email">Cold Email</option>
                <option value="event">Event</option>
                <option value="inbound">Inbound</option>
                <option value="referral">Referral</option>
                <option value="ads">Ads</option>
              </select>
            </div>
            <div className="min-w-[170px]">
              <label className="text-xs text-text-muted">Start date</label>
              <input
                type="date"
                className="input mt-1 text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <button className="btn-primary text-xs px-4 py-2" disabled={creating} onClick={create}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div className="text-sm font-semibold text-text-primary">Campaign list</div>
            <div className="text-xs text-text-muted">{items.length} items</div>
          </div>
          <div className="divide-y divide-border-subtle">
            {loading ? (
              <div className="p-6 text-xs text-text-muted">Loading...</div>
            ) : !items.length ? (
              <div className="p-6 text-xs text-text-muted">No campaigns yet</div>
            ) : (
              items.map((c) => {
                const isActive = String(c.status).toLowerCase() === 'active'
                return (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-text-primary truncate">{c.name}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {c.type} · {new Date(c.startDate).toLocaleDateString()} · leads {(c._count?.leads ?? 0).toString()}
                      </div>
                    </div>
                    <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
                      {isActive ? 'active' : 'paused'}
                    </span>
                    <button className="btn-ghost text-xs px-3 py-2" onClick={() => toggle(c)}>
                      {isActive ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

