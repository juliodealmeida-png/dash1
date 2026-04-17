import { useEffect, useState } from 'react'
import Section from '../components/Section'
import { Table } from '../components/Table'
import { api } from '../lib/api'
import type { Integration } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'

export default function Integrations() {
  const { getAccessToken } = useAuth()
  const [rows, setRows] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [hubspotAccessToken, setHubspotAccessToken] = useState('')

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sem token')
      const list = await api.integrations.list(token)
      setRows(list)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const onGmailAuth = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const out = await api.integrations.gmailAuth(token)
      window.location.href = out.url
    } catch (e: any) {
      setErr(e?.message || 'Falha no Gmail auth')
    }
  }

  const onGmailSync = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.integrations.gmailSync(token)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha no Gmail sync')
    }
  }

  const onSlackConnect = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.integrations.slackConnect(token, { webhookUrl: slackWebhookUrl })
      setSlackWebhookUrl('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha no Slack connect')
    }
  }

  const onSlackTest = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.integrations.slackTest(token)
    } catch (e: any) {
      setErr(e?.message || 'Falha no Slack test')
    }
  }

  const onHubspotConnect = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.integrations.hubspotConnect(token, { accessToken: hubspotAccessToken })
      setHubspotAccessToken('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha no HubSpot connect')
    }
  }

  const onHubspotSync = async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.integrations.hubspotSync(token)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha no HubSpot sync')
    }
  }

  const onDisconnect = async (type: string) => {
    try {
      const token = await getAccessToken()
      if (!token) return
      await api.integrations.disconnect(token, type)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Falha ao desconectar')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section title="Integrations" right={<button className="btn" onClick={refresh}>Refresh</button>}>
        {loading ? <div style={{ color: '#94a3b8' }}>Carregando…</div> : null}
        {err ? <div style={{ color: '#fca5a5', marginBottom: 10 }}>{err}</div> : null}
        <Table
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'lastSyncAt', label: 'Last Sync', render: (i: Integration) => (i.lastSyncAt || '').slice(0, 19).replace('T', ' ') },
            { key: 'errorMessage', label: 'Error', render: (i: Integration) => i.errorMessage ?? '' },
            { key: 'actions', label: 'Actions', render: (i: Integration) => (
              <button className="btn" onClick={() => onDisconnect(i.type)} style={{ height: 30, padding: '0 10px' }}>
                Disconnect
              </button>
            ) },
          ]}
          rows={rows}
        />
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        <Section title="Gmail">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={onGmailAuth}>Connect (OAuth)</button>
            <button className="btn" onClick={onGmailSync}>Sync</button>
          </div>
        </Section>

        <Section title="Slack">
          <div style={{ display: 'grid', gap: 10 }}>
            <input value={slackWebhookUrl} onChange={e => setSlackWebhookUrl(e.target.value)} placeholder="Webhook URL" style={inputStyle} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onSlackConnect} disabled={!slackWebhookUrl.trim()}>Connect</button>
              <button className="btn" onClick={onSlackTest}>Test</button>
            </div>
          </div>
        </Section>

        <Section title="HubSpot">
          <div style={{ display: 'grid', gap: 10 }}>
            <input value={hubspotAccessToken} onChange={e => setHubspotAccessToken(e.target.value)} placeholder="Private app access token" style={inputStyle} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onHubspotConnect} disabled={!hubspotAccessToken.trim()}>Connect</button>
              <button className="btn" onClick={onHubspotSync}>Sync</button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e5e7eb',
  padding: '0 12px',
  outline: 'none',
  width: '100%',
}
