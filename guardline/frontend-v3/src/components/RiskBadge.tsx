interface RiskBadgeProps {
  probability?: number
  score?: number
  label?: string
}

export default function RiskBadge({ probability, score, label }: RiskBadgeProps) {
  const val = probability ?? score ?? 0
  let color = '#34d399'
  let bg = 'rgba(52,211,153,0.12)'
  let text = label ?? 'Low'

  if (val >= 70) { color = '#34d399'; bg = 'rgba(52,211,153,0.12)'; text = label ?? 'Low' }
  else if (val >= 40) { color = '#fbbf24'; bg = 'rgba(251,191,36,0.12)'; text = label ?? 'Medium' }
  else { color = '#f87171'; bg = 'rgba(248,113,113,0.12)'; text = label ?? 'High' }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      background: bg, color, fontSize: 11, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {text}
    </span>
  )
}
