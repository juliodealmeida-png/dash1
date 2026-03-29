import Topbar from '../components/Topbar'
import { CalendarDays } from 'lucide-react'

export default function Meetings() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Meeting Prep" subtitle="Briefs automáticos gerados por IA 3h antes" />
      <div className="p-5 animate-fade-in">
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-green/10 flex items-center justify-center">
            <CalendarDays size={28} className="text-accent-green" />
          </div>
          <div className="text-center">
            <div className="text-base font-semibold text-text-primary">Meeting Prep</div>
            <div className="text-sm text-text-muted mt-1">Brief automático com MEDDPICC gaps + notícias + perguntas sugeridas</div>
            <div className="badge badge-green mt-3">Sprint 4</div>
          </div>
        </div>
      </div>
    </div>
  )
}
