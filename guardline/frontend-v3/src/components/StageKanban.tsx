import { useState } from 'react'
import RiskBadge from './RiskBadge'

interface Deal {
  id: string
  deal_name?: string
  deal_amount?: number
  deal_stage?: string
  deal_probability?: number
  created_at?: string
  source?: string
}

interface StageKanbanProps {
  deals: Deal[]
  onDealClick?: (id: string) => void
  onStageChange?: (dealId: string, stage: string) => void
}

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: '#818cf8' },
  { key: 'qualification', label: 'Qualification', color: '#60a5fa' },
  { key: 'proposal', label: 'Proposal', color: '#34d399' },
  { key: 'negotiation', label: 'Negotiation', color: '#fb923c' },
  { key: 'won', label: 'Won', color: '#4ade80' },
]

const STAGE_MAP: Record<string, string> = {
  '1031112078': 'prospecting',
  '1031112080': 'qualification',
  '1160559924': 'proposal',
  '1311981861': 'negotiation',
  '1031112083': 'won',
  '1031112084': 'lost',
  prospecting: 'prospecting',
  qualification: 'qualification',
  proposal: 'proposal',
  negotiation: 'negotiation',
  won: 'won',
  lost: 'lost',
}

function normalizeStage(s?: string) {
  return STAGE_MAP[String(s ?? '')] ?? 'prospecting'
}

export default function StageKanban({ deals, onDealClick, onStageChange }: StageKanbanProps) {
  const [dragging, setDragging] = useState<string | null>(null)

  function onDragStart(dealId: string) { setDragging(dealId) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(e: React.DragEvent, stage: string) {
    e.preventDefault()
    if (dragging) { onStageChange?.(dragging, stage); setDragging(null) }
  }

  const daysSince = (d?: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 12, minHeight: 300 }}>
      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => normalizeStage(String(d.deal_stage ?? '')) === stage.key)
        const totalVal = stageDeals.reduce((s, d) => s + Number(d.deal_amount ?? 0), 0)
        return (
          <div
            key={stage.key}
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, stage.key)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}
          >
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderTop: `2px solid ${stage.color}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stage.label}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {stageDeals.length} · ${(totalVal/1000).toFixed(0)}k
              </div>
            </div>
            {stageDeals.map(deal => (
              <div
                key={deal.id}
                draggable
                onDragStart={() => onDragStart(deal.id)}
                onClick={() => onDealClick?.(deal.id)}
                style={{
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex', flexDirection: 'column', gap: 6,
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 12, lineHeight: 1.3 }}>
                  {String(deal.deal_name ?? 'Deal')}
                </div>
                <div style={{ color: '#06b6d4', fontWeight: 700 }}>
                  ${Number(deal.deal_amount ?? 0).toLocaleString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <RiskBadge probability={Number(deal.deal_probability ?? 0)} />
                  <span style={{ color: '#64748b', fontSize: 11 }}>{daysSince(deal.created_at)}d</span>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
