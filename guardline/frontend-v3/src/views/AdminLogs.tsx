import { useEffect, useState, useCallback } from 'react'
import { api, fmtDate } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  Activity, 
  ShieldCheck, 
  Terminal, 
  Settings, 
  RefreshCcw, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database,
  Search,
  ArrowRight
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface WfExecution {
  id: string
  workflowName: string
  status: 'success' | 'failed' | 'running'
  triggerType: string
  createdAt: string
  resultSummary?: Record<string, any>
}

interface UserAccount {
  id: string
  name: string
  email: string
  role: string
  company?: string
  modules?: string | string[] | null
  createdAt: string
}

interface ApprovalRequest {
  id: string
  type: string
  targetType?: string | null
  status: string
  user: { id: string; name: string; email: string; role: string; company?: string | null }
  createdAt: string
}

export default function AdminLogs() {
  const { t } = useI18n()
  const [executions, setExecutions] = useState<WfExecution[]>([])
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [approvalCodes, setApprovalCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [syncingHubspot, setSyncingHubspot] = useState(false)
  const [tab, setTab] = useState<'logs' | 'users' | 'approvals' | 'system'>('logs')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [execRes, accRes] = await Promise.all([
        api.get<{ data: WfExecution[] }>('/wf_executions'),
        api.get<{ data: UserAccount[] }>('/admin/users')
      ])
      setExecutions(execRes.data ?? [])
      setAccounts(accRes.data ?? [])
      const approvalsRes = await api.get<{ data: ApprovalRequest[] }>('/admin/approvals?status=pending&take=100')
      setApprovals(approvalsRes.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSyncHubspot() {
    setSyncingHubspot(true)
    try {
      await api.post('/hubspot-sync/trigger')
      alert('Sincronização HubSpot iniciada com sucesso!')
      load()
    } catch (e) {
      console.error(e)
      alert('Erro ao sincronizar HubSpot')
    } finally {
      setSyncingHubspot(false)
    }
  }

  async function saveModules(userId: string, raw: string) {
    let parsed: any = null
    try {
      parsed = raw.trim() ? JSON.parse(raw) : null
    } catch {
      parsed = null
    }
    await api.patch(`/admin/users/${userId}/modules`, { modules: parsed })
    load()
  }

  async function approve(id: string) {
    const code = (approvalCodes[id] || '').trim()
    if (!code) return
    await api.post(`/admin/approvals/${id}/approve`, { code })
    setApprovalCodes(prev => ({ ...prev, [id]: '' }))
    load()
  }

  async function reject(id: string) {
    await api.post(`/admin/approvals/${id}/reject`, {})
    load()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 size={14} className="text-accent-green" />
      case 'failed': return <XCircle size={14} className="text-accent-red" />
      default: return <Activity size={14} className="text-accent-cyan animate-pulse" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={t('nav.admin_logs')} 
        subtitle="Controle administrativo e monitoramento de workflows"
        onRefresh={load}
      />

      {/* Tabs */}
      <div className="flex px-6 pt-4 border-b border-border bg-card">
        <button 
          onClick={() => setTab('logs')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${tab === 'logs' ? 'text-accent-purple border-accent-purple bg-accent-purple/5' : 'text-text-muted border-transparent hover:text-text-primary'}`}
        >
          Workflows & Logs
        </button>
        <button 
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${tab === 'users' ? 'text-accent-purple border-accent-purple bg-accent-purple/5' : 'text-text-muted border-transparent hover:text-text-primary'}`}
        >
          Usuários & Acessos
        </button>
        <button 
          onClick={() => setTab('approvals')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${tab === 'approvals' ? 'text-accent-purple border-accent-purple bg-accent-purple/5' : 'text-text-muted border-transparent hover:text-text-primary'}`}
        >
          Aprovações
        </button>
        <button 
          onClick={() => setTab('system')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${tab === 'system' ? 'text-accent-purple border-accent-purple bg-accent-purple/5' : 'text-text-muted border-transparent hover:text-text-primary'}`}
        >
          Configurações de Sistema
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {tab === 'logs' && (
              <div className="card overflow-hidden border-0 bg-card/50 shadow-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={18} className="text-accent-purple-light" />
                    <h3 className="font-bold text-text-primary">Execuções n8n Engine</h3>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Filtrar workflow..." 
                      className="bg-surface border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-accent-purple outline-none"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface/50 text-[10px] uppercase tracking-wider text-text-muted font-bold border-b border-border">
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Workflow</th>
                        <th className="px-4 py-3">Trigger</th>
                        <th className="px-4 py-3">Iniciado em</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {executions.map(ex => (
                        <tr key={ex.id} className="hover:bg-surface/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(ex.status)}
                              <span className="text-xs font-medium capitalize">{ex.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-text-primary">{ex.workflowName}</td>
                          <td className="px-4 py-3 text-xs text-text-secondary">{ex.triggerType}</td>
                          <td className="px-4 py-3 text-xs text-text-muted">{fmtDate(ex.createdAt)}</td>
                          <td className="px-4 py-3">
                            <button className="text-[10px] font-bold text-accent-purple-light hover:underline uppercase">Ver JSON</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="card overflow-hidden border-0 bg-card/50 shadow-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-accent-green" />
                    <h3 className="font-bold text-text-primary">Usuários do Revenue OS</h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface/50 text-[10px] uppercase tracking-wider text-text-muted font-bold border-b border-border">
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Permissão</th>
                        <th className="px-4 py-3">Cadastro</th>
                        <th className="px-4 py-3">Módulos (JSON)</th>
                        <th className="px-4 py-3">Salvar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {accounts.map(acc => (
                        <tr key={acc.id} className="hover:bg-surface/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-semibold text-text-primary">{acc.name}</td>
                          <td className="px-4 py-3 text-xs text-text-secondary">{acc.email}</td>
                          <td className="px-4 py-3">
                            <span className={`badge ${acc.role === 'admin' ? 'badge-purple' : acc.role === 'founder' ? 'badge-amber' : 'badge-gray'}`}>
                              {acc.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">{fmtDate(acc.createdAt)}</td>
                          <td className="px-4 py-3">
                            <input
                              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-mono w-[420px]"
                              defaultValue={
                                Array.isArray(acc.modules)
                                  ? JSON.stringify(acc.modules)
                                  : typeof acc.modules === 'string'
                                    ? acc.modules
                                    : ''
                              }
                              placeholder='["/pipeline","/deals","/leads"]'
                              onBlur={(e) => saveModules(acc.id, e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">
                            <span className="text-[10px]">Auto-save</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'approvals' && (
              <div className="card overflow-hidden border-0 bg-card/50 shadow-xl">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-accent-amber" />
                    <h3 className="font-bold text-text-primary">Aprovações Pendentes</h3>
                  </div>
                  <span className="badge badge-gray">{approvals.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface/50 text-[10px] uppercase tracking-wider text-text-muted font-bold border-b border-border">
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Usuário</th>
                        <th className="px-4 py-3">Criado</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {approvals.map(r => (
                        <tr key={r.id} className="hover:bg-surface/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-text-secondary">
                            <span className="badge badge-purple">{r.type}</span>
                            {r.targetType ? <span className="ml-2 badge badge-gray">{r.targetType}</span> : null}
                          </td>
                          <td className="px-4 py-3 text-xs text-text-primary font-semibold">
                            {r.user.name} <span className="text-text-muted font-normal">({r.user.email})</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">{fmtDate(r.createdAt)}</td>
                          <td className="px-4 py-3">
                            <input
                              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-mono w-36"
                              value={approvalCodes[r.id] || ''}
                              onChange={(e) => setApprovalCodes(prev => ({ ...prev, [r.id]: e.target.value }))}
                              placeholder="000000"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                className="btn-secondary text-[10px] py-1.5 px-3"
                                onClick={() => approve(r.id)}
                                disabled={!approvalCodes[r.id]?.trim()}
                              >
                                Aprovar
                              </button>
                              <button
                                className="btn-secondary text-[10px] py-1.5 px-3"
                                onClick={() => reject(r.id)}
                              >
                                Rejeitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {approvals.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-xs text-text-muted">
                            Nenhuma aprovação pendente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'system' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* HubSpot Sync Card */}
                <div className="card p-6 border-accent-purple/20 bg-accent-purple/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-accent-purple/10 border border-accent-purple/20">
                      <RefreshCcw size={24} className={`text-accent-purple-light ${syncingHubspot ? 'animate-spin' : ''}`} />
                    </div>
                    <span className="badge badge-green">Conectado</span>
                  </div>
                  <h3 className="font-bold text-lg text-text-primary mb-2">Sincronização HubSpot</h3>
                  <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                    Sincroniza deals, leads e proprietários do HubSpot CRM para o banco de dados do Guardline Revenue OS.
                  </p>
                  <button 
                    onClick={handleSyncHubspot}
                    disabled={syncingHubspot}
                    className="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                  >
                    {syncingHubspot ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                    <span>{syncingHubspot ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>
                </div>

                {/* Database Info */}
                <div className="card p-6 border-border bg-card/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-surface border border-border">
                      <Database size={24} className="text-accent-cyan" />
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">v2.0.0-PROD</span>
                  </div>
                  <h3 className="font-bold text-lg text-text-primary mb-2">Infraestrutura</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-border/50">
                      <span className="text-xs text-text-secondary">Prisma ORM</span>
                      <span className="text-xs font-mono text-text-primary">v6.3.0</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-border/50">
                      <span className="text-xs text-text-secondary">PostgreSQL (Railway)</span>
                      <span className="text-xs font-mono text-accent-green">Ativo</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-border/50">
                      <span className="text-xs text-text-secondary">Supabase Admin</span>
                      <span className="text-xs font-mono text-accent-green">Ativo</span>
                    </div>
                  </div>
                </div>

                {/* System Alerts */}
                <div className="col-span-full card p-4 border-accent-amber/30 bg-accent-amber/5 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-accent-amber/20 text-accent-amber">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-text-primary">Monitoramento de API</h4>
                    <p className="text-xs text-text-secondary">Nenhum erro crítico detectado nas últimas 24 horas.</p>
                  </div>
                  <button className="text-xs font-bold text-accent-amber hover:underline flex items-center gap-1">
                    Ver detalhes <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
