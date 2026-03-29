import Topbar from '../components/Topbar'
import { Rocket } from 'lucide-react'

export default function Prospecting() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Prospecting Hub" subtitle="Enriquecimento e scoring automático de leads" />
      <div className="p-5 animate-fade-in">
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-purple/10 flex items-center justify-center">
            <Rocket size={28} className="text-accent-purple-light" />
          </div>
          <div className="text-center">
            <div className="text-base font-semibold text-text-primary">Prospecting Hub</div>
            <div className="text-sm text-text-muted mt-1">Apollo + enriquecimento waterfall + scoring automático</div>
            <div className="badge badge-purple mt-3">Sprint 3</div>
          </div>
        </div>
      </div>
    </div>
  )
}
