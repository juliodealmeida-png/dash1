import { createContext, useContext, useMemo, useState } from 'react'

export type Lang = 'en' | 'pt' | 'es'

type Dict = Record<string, string>

const DICT: Record<Lang, Dict> = {
  en: {
    'section.revenue': 'Revenue',
    'section.outreach': 'Outreach',
    'section.intelligence': 'Intelligence',
    'section.system': 'System',

    'nav.command_center': 'Command Center',
    'nav.pipeline': 'Pipeline',
    'nav.deal_room': 'Deal Room',
    'nav.leads': 'Leads',
    'nav.campaigns': 'Campaigns',
    'nav.automations': 'Automations',
    'nav.battlecard': 'Battlecard',
    'nav.fraud_map': 'Fraud Map',
    'nav.investor_pipeline': 'Investor Pipeline',
    'nav.documents': 'Documents',
    'nav.admin_logs': 'Admin & Logs',
    'nav.forecast_loss': 'Forecast & Loss',
    'nav.channel_deals': 'Channel Partner Hub',
    'nav.product_intel': 'Product Intelligence',
    'nav.prospecting': 'Prospecting Hub',
    'nav.composer': 'Composer',
    'nav.sequences': 'Sequences',
    'nav.signals': 'Signal Radar',
    'nav.news': 'News & RegTech',
    'nav.meetings': 'Meeting Prep',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',

    'settings.profile': 'Profile',
    'settings.integrations': 'Integrations',
    'settings.sync': 'Synchronization',
    'settings.name': 'Name',
    'settings.email': 'Email',
    'settings.company': 'Company',
    'settings.role': 'Role',
    'settings.save': 'Save changes',
    'settings.connect': 'Connect',
    'settings.test': 'Test',
    'settings.sync_now': 'Sync Now',
    'settings.status': 'Status',
    'settings.update_status': 'Update status',

    'common.search_placeholder': 'Search deals, leads...',
    'common.refresh': 'Refresh',
    'common.notifications': 'Notifications',
    'common.logout': 'Logout',
    'common.loading': 'Loading...',
  },
  pt: {
    'section.revenue': 'Revenue',
    'section.outreach': 'Outreach',
    'section.intelligence': 'Intelligence',
    'section.system': 'Sistema',

    'nav.command_center': 'Command Center',
    'nav.pipeline': 'Pipeline',
    'nav.deal_room': 'Deal Room',
    'nav.leads': 'Leads',
    'nav.campaigns': 'Campanhas',
    'nav.automations': 'Automações',
    'nav.battlecard': 'Battlecard',
    'nav.fraud_map': 'Fraud Map',
    'nav.investor_pipeline': 'Investor Pipeline',
    'nav.documents': 'Documentos',
    'nav.admin_logs': 'Admin & Logs',
    'nav.forecast_loss': 'Forecast & Loss',
    'nav.channel_deals': 'Parceiros de Canal',
    'nav.product_intel': 'Inteligência de Produto',
    'nav.prospecting': 'Prospecting Hub',
    'nav.composer': 'Composer',
    'nav.sequences': 'Sequences',
    'nav.signals': 'Sinais',
    'nav.news': 'News & RegTech',
    'nav.meetings': 'Reuniões',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Configurações',

    'settings.profile': 'Perfil',
    'settings.integrations': 'Integrações',
    'settings.sync': 'Sincronização',
    'settings.name': 'Nome',
    'settings.email': 'Email',
    'settings.company': 'Empresa',
    'settings.role': 'Cargo',
    'settings.save': 'Salvar alterações',
    'settings.connect': 'Conectar',
    'settings.test': 'Testar',
    'settings.sync_now': 'Sincronizar Agora',
    'settings.status': 'Status',
    'settings.update_status': 'Atualizar status',

    'common.search_placeholder': 'Buscar deals, leads...',
    'common.refresh': 'Atualizar',
    'common.notifications': 'Notificações',
    'common.logout': 'Sair',
    'common.loading': 'Carregando...',
  },
  es: {
    'section.revenue': 'Revenue',
    'section.outreach': 'Outreach',
    'section.intelligence': 'Intelligence',
    'section.system': 'Sistema',

    'nav.command_center': 'Centro de Mando',
    'nav.pipeline': 'Pipeline',
    'nav.deal_room': 'Sala de Deals',
    'nav.leads': 'Leads',
    'nav.campaigns': 'Campañas',
    'nav.automations': 'Automatizaciones',
    'nav.battlecard': 'Battlecard',
    'nav.fraud_map': 'Mapa de Fraude',
    'nav.investor_pipeline': 'Investor Pipeline',
    'nav.documents': 'Documentos',
    'nav.admin_logs': 'Admin & Logs',
    'nav.forecast_loss': 'Forecast & Loss',
    'nav.channel_deals': 'Canal de Socios',
    'nav.product_intel': 'Inteligencia de Producto',
    'nav.prospecting': 'Prospecting Hub',
    'nav.composer': 'Composer',
    'nav.sequences': 'Sequences',
    'nav.signals': 'Señales',
    'nav.news': 'Noticias & RegTech',
    'nav.meetings': 'Reuniones',
    'nav.analytics': 'Analítica',
    'nav.settings': 'Ajustes',

    'settings.profile': 'Perfil',
    'settings.integrations': 'Integraciones',
    'settings.sync': 'Sincronización',
    'settings.name': 'Nombre',
    'settings.email': 'Email',
    'settings.company': 'Empresa',
    'settings.role': 'Cargo',
    'settings.save': 'Guardar cambios',
    'settings.connect': 'Conectar',
    'settings.test': 'Probar',
    'settings.sync_now': 'Sincronizar Ahora',
    'settings.status': 'Estado',
    'settings.update_status': 'Actualizar estado',

    'common.search_placeholder': 'Buscar deals, leads...',
    'common.refresh': 'Atualizar',
    'common.notifications': 'Notificaciones',
    'common.logout': 'Salir',
    'common.loading': 'Cargando...',
  },
}

function normalizeLang(v: string | null | undefined): Lang {
  const s = String(v || '').toLowerCase()
  if (s === 'pt' || s.startsWith('pt-')) return 'pt'
  if (s === 'es' || s.startsWith('es-')) return 'es'
  return 'en'
}

type I18nCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, fallback?: string) => string
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('gl_lang')
    if (stored) return normalizeLang(stored)
    return normalizeLang(navigator.language)
  })

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('gl_lang', l)
  }

  const value = useMemo<I18nCtx>(() => {
    return {
      lang,
      setLang,
      t: (key: string, fallback?: string) => {
        const d = DICT[lang] || DICT.en
        return d[key] || fallback || key
      },
    }
  }, [lang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('I18nProvider missing')
  return v
}
