import { useState } from 'react'

const MOCK_THREADS = [
  { id: '1', name: 'Tony Stark', subject: 'Re: API Integration Proposal', time: '10:42 AM', unread: true },
  { id: '2', name: 'Bruce Wayne', subject: 'Q3 Forecast Update', time: 'Yesterday', unread: false },
  { id: '3', name: 'Clark Kent', subject: 'Pricing details needed', time: 'Mon', unread: false }
]

export default function Inbox() {
  const [activeThread, setActiveThread] = useState(MOCK_THREADS[0].id)
  const [replyText, setReplyText] = useState('')

  const handleSend = () => {
    alert('Simulación: Respuesta será enviada vía integración Gmail a ' + MOCK_THREADS.find(t => t.id === activeThread)?.name)
    setReplyText('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Sales Inbox</h1>
      </div>
      
      <div className="card" style={{ flex: 1, display: 'flex', padding: 0, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{ width: 300, borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)' }}>
            <input 
              type="text" 
              placeholder="Buscar en correos..." 
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {MOCK_THREADS.map(thread => (
              <div 
                key={thread.id} 
                onClick={() => setActiveThread(thread.id)}
                style={{ 
                  padding: 16, borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                  background: activeThread === thread.id ? 'var(--bg-card-hover)' : 'transparent',
                  borderLeft: activeThread === thread.id ? '3px solid var(--accent-cyan)' : '3px solid transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: thread.unread ? 700 : 500, color: 'var(--text-primary)' }}>{thread.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{thread.time}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.subject}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
          {/* Messages Area */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card)', padding: 16, borderRadius: '12px 12px 12px 0', border: '1px solid var(--border-subtle)', maxWidth: '80%' }}>
               <div style={{ fontSize: 12, color: 'var(--accent-cyan)', marginBottom: 4 }}>{MOCK_THREADS.find(t=>t.id===activeThread)?.name}</div>
               <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>Hola. Ya revisé la propuesta que enviaron ayer, pero el pricing no me queda claro. ¿Podemos agendar una call mañana?</div>
             </div>
             <div style={{ alignSelf: 'flex-end', background: 'var(--accent-purple-dim)', padding: 16, borderRadius: '12px 12px 0 12px', border: '1px solid rgba(124,58,237,0.3)', maxWidth: '80%' }}>
               <div style={{ fontSize: 12, color: 'var(--accent-purple-light)', marginBottom: 4 }}>Tú</div>
               <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>¡Claro que sí! Con gusto te explico los detalles de la integración. Te envié la liga de calendario.</div>
             </div>
          </div>
          
          {/* Composer */}
          <div style={{ padding: 16, borderTop: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
            <textarea 
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Escribe tu respuesta..." 
              style={{ width: '100%', padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', minHeight: 80, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
               <button style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Usar Júlio AI</button>
               <button onClick={handleSend} style={{ background: 'var(--accent-cyan)', color: 'var(--bg-base)', border: 'none', padding: '8px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
