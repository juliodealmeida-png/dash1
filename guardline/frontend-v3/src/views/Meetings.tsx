import { useEffect, useState, useCallback } from 'react'
import { api, fmtDate } from '../lib/api'
import Topbar from '../components/Topbar'
import { 
  CalendarDays, 
  Loader2, 
  Video, 
  MapPin, 
  Clock, 
  ChevronRight,
  BrainCircuit,
  FileText,
  User,
  Target
} from 'lucide-react'
import { useI18n } from '../context/I18nContext'

interface Meeting {
  id: string
  companyName: string
  contactName: string
  ownerName: string
  startTime: string
  status: string
  meetingType: 'video' | 'in_person'
  location?: string
}

export default function Meetings() {
  const { t } = useI18n()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Meeting[] }>('/meetings')
      setMeetings(res.data ?? [])
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
        title={t('nav.meetings')} 
        subtitle="Preparação automática para reuniões com insights de IA"
        onRefresh={load}
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Meeting List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Próximas Reuniões</h3>
              
              {meetings.length === 0 && (
                <div className="card py-16 text-center">
                  <CalendarDays size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
                  <p className="text-text-secondary">Nenhuma reunião agendada para hoje</p>
                </div>
              )}

              {meetings.map(m => (
                <div key={m.id} className="card p-5 hover:border-accent-purple/30 transition-all group cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex flex-col items-center justify-center shrink-0 group-hover:bg-accent-purple/5 transition-colors">
                      <span className="text-[10px] font-bold text-accent-purple-light uppercase">{new Date(m.startTime).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                      <span className="text-lg font-black text-text-primary">{new Date(m.startTime).getDate()}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-text-primary text-lg truncate">{m.companyName}</h4>
                        <span className="badge badge-purple">Discovery</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <User size={14} className="text-text-muted" />
                          {m.contactName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <Clock size={14} className="text-text-muted" />
                          {new Date(m.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          {m.meetingType === 'video' ? <Video size={14} className="text-text-muted" /> : <MapPin size={14} className="text-text-muted" />}
                          {m.location || 'Google Meet'}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight size={20} className="text-text-muted self-center" />
                  </div>
                </div>
              ))}
            </div>

            {/* Right: AI Prep Panel */}
            <div className="space-y-6">
              <div className="card p-6 bg-gradient-to-br from-accent-purple/10 to-transparent border-accent-purple/20">
                <div className="flex items-center gap-2 mb-6">
                  <BrainCircuit size={20} className="text-accent-purple-light" />
                  <h3 className="font-bold text-text-primary">AI Meeting Prep</h3>
                </div>
                
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-accent-cyan" />
                      <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Contexto do Deal</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Último contato foi há 3 dias. Champion confirmou que o orçamento para "Fraud Prevention" foi aprovado para o Q3.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-accent-amber" />
                      <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Gaps MEDDPICC</span>
                    </div>
                    <ul className="space-y-2">
                      <li className="text-[10px] text-text-secondary flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent-amber mt-1.5 shrink-0" />
                        Ainda não identificamos o "Economic Buyer" real.
                      </li>
                      <li className="text-[10px] text-text-secondary flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent-amber mt-1.5 shrink-0" />
                        "Decision Process" parece nebuloso após a demo.
                      </li>
                    </ul>
                  </div>

                  <button className="w-full btn-primary py-2.5 text-xs font-bold uppercase tracking-widest">
                    Gerar Briefing Completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
