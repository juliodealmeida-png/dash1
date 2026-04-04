import './kpi.css'

export default function KpiCard({
  label,
  value,
  subtitle,
  tone = 'neutral',
  onClick,
}: {
  label: string
  value: string | number
  subtitle?: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info'
  onClick?: () => void
}) {
  return (
    <button className={`kpiCard ${tone}`} onClick={onClick} disabled={!onClick}>
      <div className="kpiLabel">{label}</div>
      <div className="kpiValue">{value}</div>
      {subtitle ? <div className="kpiSub">{subtitle}</div> : null}
    </button>
  )
}

