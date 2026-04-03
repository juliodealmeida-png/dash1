interface KpiCardProps {
  label: string
  value: string | number
  subtitle?: string
  color?: string
  onClick?: () => void
}

export default function KpiCard({ label, value, subtitle, color = '#06b6d4', onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.2s',
        minWidth: 0,
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = '#263347')}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = '#1e293b')}
    >
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{subtitle}</div>
      )}
    </div>
  )
}
