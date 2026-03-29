import Topbar from '../components/Topbar'
import { Newspaper } from 'lucide-react'

export default function News() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="News & RegTech" subtitle="Monitoramento regulatório LATAM em tempo real" />
      <div className="p-5 animate-fade-in">
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 flex items-center justify-center">
            <Newspaper size={28} className="text-accent-amber" />
          </div>
          <div className="text-center">
            <div className="text-base font-semibold text-text-primary">RegTech Monitor</div>
            <div className="text-sm text-text-muted mt-1">BACEN · UIF · CNBV · SBS · CMF · UIAF</div>
            <div className="badge badge-amber mt-3">Sprint 4</div>
          </div>
        </div>
      </div>
    </div>
  )
}
