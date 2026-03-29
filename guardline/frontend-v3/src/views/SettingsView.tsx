import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
import { Settings, User, Bell, Link, Database } from 'lucide-react'

export default function SettingsView() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Settings" subtitle="Configurações da conta e integrações" />
      <div className="p-5 space-y-4 animate-fade-in max-w-2xl">
        {/* Profile */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-accent-purple-light" />
            <span className="text-sm font-semibold text-text-primary">Perfil</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-muted">Nome</label><input className="input mt-1 text-xs" defaultValue={user?.name} /></div>
            <div><label className="text-xs text-text-muted">Email</label><input className="input mt-1 text-xs" defaultValue={user?.email} disabled /></div>
            <div><label className="text-xs text-text-muted">Empresa</label><input className="input mt-1 text-xs" defaultValue={user?.company ?? ''} /></div>
            <div><label className="text-xs text-text-muted">Role</label><input className="input mt-1 text-xs" defaultValue={user?.role} disabled /></div>
          </div>
          <button className="btn-primary text-xs px-4 py-2">Salvar alterações</button>
        </div>

        {/* Integrations */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Link size={14} className="text-accent-cyan" />
            <span className="text-sm font-semibold text-text-primary">Integrações</span>
          </div>
          {[
            { name: 'HubSpot CRM', status: 'configured', color: 'badge-green' },
            { name: 'Anthropic AI (Julio)', status: 'configured', color: 'badge-green' },
            { name: 'Gmail', status: 'not configured', color: 'badge-gray' },
            { name: 'n8n Automation', status: 'not configured', color: 'badge-gray' },
            { name: 'Apollo.io', status: 'not configured', color: 'badge-gray' },
          ].map(i => (
            <div key={i.name} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
              <span className="text-xs text-text-secondary">{i.name}</span>
              <span className={`badge ${i.color}`}>{i.status}</span>
            </div>
          ))}
        </div>

        {/* Sync */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} className="text-accent-amber" />
            <span className="text-sm font-semibold text-text-primary">Sincronização</span>
          </div>
          <div className="text-xs text-text-muted mb-3">Backend Express + SQLite rodando em localhost:4000</div>
          <button className="btn-ghost text-xs flex items-center gap-2">
            <Settings size={12} /> Sincronizar agora
          </button>
        </div>
      </div>
    </div>
  )
}
