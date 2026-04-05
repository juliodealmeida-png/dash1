import { useState } from 'react'

export default function Meetings() {
  const days = Array.from({ length: 28 }, (_, i) => {
    // Generate some random heatmap intensities
    const intensity = Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 1 : 0
    return { day: i + 1, intensity }
  })

  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const upcoming = [
    { time: '10:00 AM', company: 'Wayne Enterprises', type: 'Discovery Call' },
    { time: '02:30 PM', company: 'Stark Industries', type: 'Demo P2' },
    { time: '04:00 PM', company: 'Acme Corp', type: 'Pricing Review' }
  ]

  const getHeatmapColor = (intensity: number) => {
    switch(intensity) {
      case 1: return 'rgba(6,182,212,0.2)'
      case 2: return 'rgba(6,182,212,0.4)'
      case 3: return 'rgba(6,182,212,0.7)'
      case 4: return 'rgba(6,182,212,1)'
      default: return 'var(--bg-card-hover)'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Calendar &amp; Heatmap</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, flex: 1 }}>
        {/* Heatmap Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Schedule Density</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
            {['Lun', 'Mar', 'Mier', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, flex: 1 }}>
            {days.map(d => (
              <div 
                key={d.day}
                onClick={() => setSelectedDay(d.day)}
                style={{
                  background: getHeatmapColor(d.intensity),
                  border: selectedDay === d.day ? '2px solid var(--accent-purple)' : '1px solid transparent',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: d.intensity > 2 ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 18,
                  transition: 'transform 0.15s ease'
                }}
              >
                {d.day}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="card" style={{ borderLeft: '1px solid var(--border-default)' }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Próximas Reuniones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.map((u, i) => (
              <div key={i} className="brief-item info">
                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.company}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                  <span>{u.type}</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{u.time}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedDay && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Detalles del Día {selectedDay}</h3>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Ningún evento crítico este día.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
