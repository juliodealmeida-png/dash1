import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  GitBranch, 
  Play, 
  Pause, 
  Users, 
  Mail, 
  Linkedin, 
  Phone,
  BarChart2,
  Loader2,
  Plus,
  MoreHorizontal
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface Sequence {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft'
  steps: number
  enrolled: number
  openRate: number
  replyRate: number
}

export default function Sequences() {
  const { t } = useI18n()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Mocking sequences for now, as they are usually handled by n8n workflows
      // but showing a real UI is better than a placeholder
      setSequences([
        { id: '1', name: 'Inbound - KYC/AML LATAM', status: 'active', steps: 5, enrolled: 124, openRate: 68, replyRate: 12 },
        { id: '2', name: 'Outbound - Fintech Tier 1', status: 'active', steps: 7, enrolled: 45, openRate: 42, replyRate: 5 },
        { id: '3', name: 'Re-engagement - Cold Leads', status: 'paused', steps: 3, enrolled: 890, openRate: 25, replyRate: 2 },
        { id: '4', name: 'Event Follow-up - FEBRABAN', status: 'draft', steps: 4, enrolled: 0, openRate: 0, replyRate: 0 },
      ])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col h-full bg-surface">
      <Topbar 
        title={t('nav.sequences')} 
        subtitle="Cadências multi-canal automatizadas (Email, LinkedIn, WA)"
        onRefresh={load}
      />

      <div className="p-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <div className="card px-4 py-2 flex items-center gap-3">
              <Users size={18} className="text-accent-purple-light" />
              <div>
                <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Total Ativos</div>
                <div className="text-lg font-bold text-text-primary">1,059</div>
              </div>
            </div>
            <div className="card px-4 py-2 flex items-center gap-3">
              <BarChart2 size={18} className="text-accent-green" />
              <div>
                <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Média de Resposta</div>
                <div className="text-lg font-bold text-text-primary">8.4%</div>
              </div>
            </div>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>Criar Cadência</span>
          </button>
        </div>

        {/* Sequences Table/List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface/50 text-[10px] uppercase font-bold text-text-muted border-b border-border">
                  <th className="px-6 py-4">Nome da Cadência</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Passos</th>
                  <th className="px-6 py-4">Inscritos</th>
                  <th className="px-6 py-4">Abertura / Resposta</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sequences.map(s => (
                  <tr key={s.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary group-hover:text-accent-purple-light transition-colors">{s.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail size={10} className="text-text-muted" />
                        <Linkedin size={10} className="text-text-muted" />
                        <Phone size={10} className="text-text-muted" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'paused' ? 'badge-amber' : 'badge-gray'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{s.steps} steps</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{s.enrolled}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-[10px] text-text-muted">Abertura</div>
                          <div className="text-xs font-bold text-text-primary">{s.openRate}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-text-muted">Resposta</div>
                          <div className="text-xs font-bold text-accent-green">{s.replyRate}%</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-surface rounded-lg text-text-muted transition-colors">
                          {s.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button className="p-2 hover:bg-surface rounded-lg text-text-muted transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
