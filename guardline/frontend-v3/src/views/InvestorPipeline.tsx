import { useEffect, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api, fmtCurrency } from '../lib/api'
import Topbar from '../components/Topbar'
import { Loader2, TrendingUp, Building2, User } from 'lucide-react'
import { useI18n } from '../context/I18nContext'

// ── Types ─────────────────────────────────────────────────
interface InvestorDeal {
  id: string
  investorName: string
  firm: string
  stage: string
  probability: number
  ticketMin?: number
  ticketMax?: number
  contactName?: string
  updatedAt: string
}

// ── Stage config ──────────────────────────────────────────
const STAGES = [
  { key: 'cold_outreach',      label: 'Outreach',     color: '#94a3b8' },
  { key: 'first_meeting',      label: '1ª Reunião',   color: '#7c3aed' },
  { key: 'interest_confirmed', label: 'Interesse',    color: '#06b6d4' },
  { key: 'term_sheet',         label: 'Term Sheet',   color: '#10b981' },
  { key: 'due_diligence',      label: 'Due Diligence', color: '#f59e0b' },
  { key: 'closed',             label: 'Fechado ✓',     color: '#059669' },
]

// ── Investor Card ─────────────────────────────────────────
function InvestorCard({ deal, overlay = false }: { deal: InvestorDeal; overlay?: boolean }) {
  return (
    <div className={`deal-card ${overlay ? 'shadow-2xl opacity-90 rotate-1' : ''}`}>
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-text-primary truncate leading-snug">
            {deal.investorName}
          </div>
          {deal.firm && (
            <div className="flex items-center gap-1 text-[10px] text-text-muted truncate">
              <Building2 size={10} /> {deal.firm}
            </div>
          )}
        </div>
        <span className={`badge ${deal.probability >= 60 ? 'badge-green' : deal.probability >= 30 ? 'badge-amber' : 'badge-red'}`}>
          {deal.probability}%
        </span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-text-primary">
          {deal.ticketMin ? fmtCurrency(deal.ticketMin) : 'N/A'}
        </span>
        <TrendingUp size={14} className="text-accent-purple/40" />
      </div>

      {deal.contactName && (
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-2 pt-2 border-t border-border-subtle">
          <User size={10} />
          {deal.contactName}
        </div>
      )}
    </div>
  )
}

// ── Sortable Card ─────────────────────────────────────────
function SortableInvestorCard({ deal }: { deal: InvestorDeal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <InvestorCard deal={deal} />
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────
function KanbanColumn({ stage, deals }: { stage: typeof STAGES[0]; deals: InvestorDeal[] }) {
  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
          <span className="text-xs font-semibold text-text-primary">{stage.label}</span>
          <span className="badge badge-gray">{deals.length}</span>
        </div>
      </div>

      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-180px)] pr-0.5">
          {deals.length === 0 && (
            <div className="text-center text-[10px] text-text-muted py-6 border border-dashed border-border-subtle rounded-xl">
              Vazio
            </div>
          )}
          {deals.map(deal => (
            <SortableInvestorCard key={deal.id} deal={deal} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

// ── View ──────────────────────────────────────────────────
export default function InvestorPipeline() {
  const { t } = useI18n()
  const [deals, setDeals] = useState<InvestorDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ columns: Record<string, InvestorDeal[]> }>('/investor/deals/kanban')
      // Flatten columns into a single array for dnd-kit context
      const all: InvestorDeal[] = []
      if (res.columns) {
        Object.values(res.columns).forEach(list => all.push(...list))
      }
      setDeals(all)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const dealsByStage = (stageKey: string) => deals.filter(d => d.stage === stageKey)
  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const targetDeal = deals.find(d => d.id === over.id)
    const targetStage = targetDeal ? targetDeal.stage : STAGES.find(s => s.key === over.id)?.key
    if (!targetStage) return

    const srcDeal = deals.find(d => d.id === active.id)
    if (!srcDeal || srcDeal.stage === targetStage) return

    setDeals(prev => prev.map(d => d.id === active.id ? { ...d, stage: targetStage } : d))

    try {
      await api.put(`/investor/deals/${active.id}`, { stage: targetStage })
    } catch {
      setDeals(prev => prev.map(d => d.id === active.id ? { ...d, stage: srcDeal.stage } : d))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar 
        title={t('nav.investor_pipeline')} 
        subtitle="Gestão de Fundraising e Relações com Investidores"
        onRefresh={load}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent-purple" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 p-4 overflow-x-auto flex-1">
            {STAGES.map(stage => (
              <KanbanColumn key={stage.key} stage={stage} deals={dealsByStage(stage.key)} />
            ))}
          </div>
          <DragOverlay>
            {activeDeal && <InvestorCard deal={activeDeal} overlay />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
