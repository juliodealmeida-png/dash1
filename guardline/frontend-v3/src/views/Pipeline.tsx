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
import { useNavigate } from 'react-router-dom'
import { api, fmtCurrency, daysSince } from '../lib/api'
import Topbar from '../components/Topbar'
import { Loader2, AlertTriangle, Clock } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────
interface Deal {
  id: string
  title: string
  companyName: string
  value: number
  stage: string
  riskScore: number
  probability: number
  updatedAt: string
  stageChangedAt: string
  owner?: { name: string }
  meddpiccScore?: number
}

// ── Stage config ──────────────────────────────────────────
const STAGES = [
  { key: 'prospecting',  label: 'Prospecção',   color: '#7c3aed' },
  { key: 'qualified',    label: 'Qualificado',  color: '#9d5cf5' },
  { key: 'presentation', label: 'Apresentação', color: '#06b6d4' },
  { key: 'proposal',     label: 'Proposta',     color: '#0891b2' },
  { key: 'negotiation',  label: 'Negociação',   color: '#10b981' },
  { key: 'won',          label: 'Ganho ✓',      color: '#059669' },
]

// ── Health color helper ───────────────────────────────────
function healthColor(deal: Deal): 'green' | 'yellow' | 'red' {
  const days = daysSince(deal.stageChangedAt ?? deal.updatedAt)
  if (deal.riskScore >= 75 || days > 21) return 'red'
  if (deal.riskScore >= 50 || days > 10) return 'yellow'
  return 'green'
}

// ── MEDDPICC bar ──────────────────────────────────────────
function MeddpiccBar({ score = 0 }: { score?: number }) {
  const color = score >= 70 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444'
  return (
    <div className="meddpicc-bar mt-1.5">
      <div
        className="meddpicc-fill"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  )
}

// ── Deal Card ─────────────────────────────────────────────
function DealCard({ deal, overlay = false }: { deal: Deal; overlay?: boolean }) {
  const navigate = useNavigate()
  const daysInStage = daysSince(deal.stageChangedAt ?? deal.updatedAt)
  const health = healthColor(deal)

  return (
    <div
      className={`deal-card ${overlay ? 'shadow-2xl opacity-90 rotate-1' : ''}`}
      onClick={() => !overlay && navigate(`/deals/${deal.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-text-primary truncate leading-snug">
            {deal.companyName}
          </div>
          {deal.title && deal.title !== deal.companyName && (
            <div className="text-[10px] text-text-muted truncate">{deal.title}</div>
          )}
        </div>
        <div className={`health-dot ${health} shrink-0 mt-0.5`} />
      </div>

      {/* Value + Probability */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-text-primary">{fmtCurrency(deal.value)}</span>
        <span className={`badge ${deal.probability >= 60 ? 'badge-green' : deal.probability >= 30 ? 'badge-amber' : 'badge-red'}`}>
          {deal.probability}%
        </span>
      </div>

      {/* MEDDPICC */}
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>MEDDPICC</span>
        <span>{deal.meddpiccScore ?? 0}%</span>
      </div>
      <MeddpiccBar score={deal.meddpiccScore ?? 0} />

      {/* Days in stage */}
      <div className="flex items-center gap-1 mt-2">
        {daysInStage > 10 && (
          <AlertTriangle size={10} className={health === 'red' ? 'text-accent-red' : 'text-accent-amber'} />
        )}
        <span className={`text-[10px] ${daysInStage > 14 ? 'text-accent-red' : daysInStage > 7 ? 'text-accent-amber' : 'text-text-muted'}`}>
          <Clock size={9} className="inline mr-0.5" />
          {daysInStage}d neste estágio
        </span>
      </div>
    </div>
  )
}

// ── Sortable Deal Card ────────────────────────────────────
function SortableDealCard({ deal }: { deal: Deal }) {
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
      <DealCard deal={deal} />
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────
function KanbanColumn({
  stage,
  deals,
}: {
  stage: (typeof STAGES)[0]
  deals: Deal[]
}) {
  const total = deals.reduce((s, d) => s + d.value, 0)

  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
          <span className="text-xs font-semibold text-text-primary">{stage.label}</span>
          <span className="badge badge-gray">{deals.length}</span>
        </div>
        <span className="text-[10px] text-text-muted font-mono">{fmtCurrency(total)}</span>
      </div>

      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-180px)] pr-0.5">
          {deals.length === 0 && (
            <div className="text-center text-[10px] text-text-muted py-6 border border-dashed border-border-subtle rounded-xl">
              Sem deals
            </div>
          )}
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Pipeline View ─────────────────────────────────────────
export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: Deal[] }>('/deals?perPage=200')
      setDeals(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const dealsByStage = (stageKey: string) =>
    deals.filter((d) => d.stage === stageKey)

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return

    // Determine target stage: over.id could be a deal id or a stage key
    const targetDeal = deals.find((d) => d.id === over.id)
    const targetStage = targetDeal
      ? targetDeal.stage
      : STAGES.find((s) => s.key === over.id)?.key

    if (!targetStage) return

    const srcDeal = deals.find((d) => d.id === active.id)
    if (!srcDeal || srcDeal.stage === targetStage) return

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => d.id === active.id ? { ...d, stage: targetStage } : d)
    )

    try {
      await api.patch(`/deals/${active.id}/stage`, { stage: targetStage })
    } catch {
      // Revert
      setDeals((prev) =>
        prev.map((d) => d.id === active.id ? { ...d, stage: srcDeal.stage } : d)
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Pipeline"
        subtitle={`${deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').length} deals ativos`}
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
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                deals={dealsByStage(stage.key)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} overlay />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
