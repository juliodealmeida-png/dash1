import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './views/Login'
import CommandCenter from './views/CommandCenter'
import Pipeline from './views/Pipeline'
import Leads from './views/Leads'
import DealRoom from './views/DealRoom'
import Prospecting from './views/Prospecting'
import Composer from './views/Composer'
import Sequences from './views/Sequences'
import Signals from './views/Signals'
import News from './views/News'
import Meetings from './views/Meetings'
import Analytics from './views/Analytics'
import SettingsView from './views/SettingsView'
import JulioAI from './components/JulioAI'

function ProtectedApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<CommandCenter />} />
        <Route path="/pipeline"    element={<Pipeline />} />
        <Route path="/leads"       element={<Leads />} />
        <Route path="/deals"       element={<DealRoom />} />
        <Route path="/deals/:id"   element={<DealRoom />} />
        <Route path="/prospecting" element={<Prospecting />} />
        <Route path="/composer"    element={<Composer />} />
        <Route path="/sequences"   element={<Sequences />} />
        <Route path="/signals"     element={<Signals />} />
        <Route path="/news"        element={<News />} />
        <Route path="/meetings"    element={<Meetings />} />
        <Route path="/analytics"   element={<Analytics />} />
        <Route path="/settings"    element={<SettingsView />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
      <JulioAI />
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/*"     element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}
