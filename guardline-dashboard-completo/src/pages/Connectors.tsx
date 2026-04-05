import { useState } from 'react'
import Section from '../components/Section'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Connectors() {
  const { getAccessToken } = useAuth()
  const [type, setType] = useState('n8n')
  const [json, setJson] = useState('{\n  \n}')
  const [err, setErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const onSave = async () => {
    setErr(null)
    setOkMsg(null)
    try {
      const token = await getAccessToken()
      if (!token) return
      const payload = JSON.parse(json || '{}') as Record<string, unknown>
      await api.connectors.save(token, type, payload)
      setOkMsg('Salvo')
    } catch (e: any) {
      setErr(e?.message || 'Falha ao salvar')
    }
  }

  const onDisconnect = async () => {
    setErr(null)
    setOkMsg(null)
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.connectors.disconnect(token, type)
      setOkMsg('Desconectado')
    } catch (e: any) {
      setErr(e?.message || 'Falha ao desconectar')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Connectors (credentials store)">
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10 }}>
            <label style={labelStyle}>
              Type
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                <option value="n8n">n8n</option>
                <option value="gmail">gmail</option>
                <option value="slack">slack</option>
                <option value="hubspot">hubspot</option>
                <option value="custom">custom</option>
              </select>
            </label>
            <div style={{ alignSelf: 'end', display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onSave}>Save</button>
              <button className="btn" onClick={onDisconnect}>Disconnect</button>
            </div>
          </div>

          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            Este endpoint grava credenciais no backend. Não coloque segredos reais aqui se você for versionar este projeto.
          </div>

          {err ? <div style={{ color: '#fca5a5', fontSize: 12 }}>{err}</div> : null}
          {okMsg ? <div style={{ color: '#34d399', fontSize: 12 }}>{okMsg}</div> : null}

          <textarea value={json} onChange={e => setJson(e.target.value)} style={taStyle} />
        </div>
      </Section>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 12, color: '#94a3b8' }

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
}

const taStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 260,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.03)',
  color: '#e5e7eb',
  padding: 12,
  outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 12,
}
