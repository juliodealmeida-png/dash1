import { useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar'
import { api } from '../lib/api'

type Recipe = {
  id: string
  name: string
  description?: string | null
  trigger: string
  actions: string
  active: boolean
  timesActivated: number
  lastActivated?: string | null
}

type AutomationLog = {
  id: string
  recipeId: string
  triggeredBy?: string | null
  status: string
  result?: string | null
  errorMessage?: string | null
  duration?: number | null
  createdAt: string
  recipe?: { name: string }
  deal?: { title: string; companyName?: string }
}

type PublicConfig = {
  success: boolean
  data?: { n8n?: { base?: string } }
}

export default function Automations() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [n8nBase, setN8nBase] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2, cfg] = await Promise.allSettled([
        api.get<{ data: Recipe[] }>('/automations/recipes'),
        api.get<{ data: AutomationLog[] }>('/automations/logs?take=50'),
        api.get<PublicConfig>('/config/public'),
      ])

      if (r1.status === 'fulfilled') setRecipes(r1.value.data ?? [])
      else setRecipes([])

      if (r2.status === 'fulfilled') setLogs(r2.value.data ?? [])
      else setLogs([])

      if (cfg.status === 'fulfilled') setN8nBase(String(cfg.value?.data?.n8n?.base || ''))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    const total = logs.length
    const ok = logs.filter((l) => l.status === 'success').length
    const err = logs.filter((l) => l.status === 'error' || !!l.errorMessage).length
    const rate = total ? Math.round((ok / total) * 100) : null
    return { total, ok, err, rate }
  }, [logs])

  async function runRecipe(recipeId: string) {
    setRunningId(recipeId)
    try {
      await api.post('/automations/trigger', { recipeId, triggeredBy: 'v3', source: 'dashboard_v3' })
      await load()
    } catch {
      await load()
    } finally {
      setRunningId(null)
    }
  }

  function openN8n() {
    const base = String(n8nBase || '').replace(/\/$/, '')
    if (!base || !/^https?:\/\//i.test(base)) return
    window.open(base, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar
        title="Automations"
        subtitle={summary.rate != null ? `${summary.ok}/${summary.total} ok · ${summary.rate}%` : '—'}
        onRefresh={load}
      />
      <div className="p-5 space-y-4 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="card">
            <div className="text-xs text-text-muted">Total logs</div>
            <div className="text-2xl font-extrabold text-text-primary mt-1">{summary.total}</div>
          </div>
          <div className="card">
            <div className="text-xs text-text-muted">Errors</div>
            <div className="text-2xl font-extrabold text-accent-red mt-1">{summary.err}</div>
          </div>
          <div className="card flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted">n8n</div>
              <div className="text-xs text-text-secondary mt-1 truncate max-w-[240px]">{n8nBase || 'not configured'}</div>
            </div>
            <button className="btn-ghost text-xs px-3 py-2" disabled={!n8nBase} onClick={openN8n}>
              Open
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div className="text-sm font-semibold text-text-primary">Recipes</div>
              <div className="text-xs text-text-muted">{recipes.length}</div>
            </div>
            <div className="divide-y divide-border-subtle">
              {loading ? (
                <div className="p-6 text-xs text-text-muted">Loading...</div>
              ) : !recipes.length ? (
                <div className="p-6 text-xs text-text-muted">No recipes found</div>
              ) : (
                recipes.map((r) => (
                  <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-text-primary truncate">{r.name}</div>
                      <div className="text-[10px] text-text-muted mt-0.5 line-clamp-2">
                        {r.description || `${r.trigger}`}
                      </div>
                      <div className="text-[10px] text-text-muted mt-1">
                        trigger {r.trigger} · runs {r.timesActivated}
                      </div>
                    </div>
                    <button
                      className="btn-primary text-xs px-3 py-2 shrink-0"
                      disabled={!!runningId}
                      onClick={() => runRecipe(r.id)}
                    >
                      {runningId === r.id ? 'Running...' : 'Run'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div className="text-sm font-semibold text-text-primary">Execution logs</div>
              <div className="text-xs text-text-muted">{logs.length}</div>
            </div>
            <div className="divide-y divide-border-subtle">
              {loading ? (
                <div className="p-6 text-xs text-text-muted">Loading...</div>
              ) : !logs.length ? (
                <div className="p-6 text-xs text-text-muted">No logs yet</div>
              ) : (
                logs.map((l) => {
                  const err = l.status === 'error' || !!l.errorMessage
                  const title = l.recipe?.name || l.recipeId
                  const when = new Date(l.createdAt).toLocaleString()
                  return (
                    <div key={l.id} className="px-4 py-3 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${err ? 'bg-accent-red' : 'bg-accent-green'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-text-primary truncate">{title}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {l.triggeredBy || '—'} · {when}
                          {l.duration != null ? ` · ${l.duration}ms` : ''}
                        </div>
                        {err ? (
                          <div className="text-[10px] text-accent-red mt-1 line-clamp-2">{l.errorMessage}</div>
                        ) : (
                          <div className="text-[10px] text-text-muted mt-1 line-clamp-2">
                            {l.result ? String(l.result).slice(0, 160) : 'ok'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

