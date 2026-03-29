import Topbar from '../components/Topbar'
import { GitBranch } from 'lucide-react'

export default function Sequences() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Sequences" subtitle="Cadências multi-canal automatizadas" />
      <div className="p-5 animate-fade-in">
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 flex items-center justify-center">
            <GitBranch size={28} className="text-accent-cyan" />
          </div>
          <div className="text-center">
            <div className="text-base font-semibold text-text-primary">Sequence Engine</div>
            <div className="text-sm text-text-muted mt-1">Email → LinkedIn → WhatsApp multi-step automático</div>
            <div className="badge badge-cyan mt-3">Sprint 3</div>
          </div>
        </div>
      </div>
    </div>
  )
}
