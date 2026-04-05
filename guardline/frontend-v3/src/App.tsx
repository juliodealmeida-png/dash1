import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './contexts/AuthContext'
import { I18nProvider } from './contexts/I18nContext'
import { ToastProvider } from './contexts/ToastContext'
import { SocketProvider } from './contexts/SocketContext'
import Layout from './components/Layout'
import LoginPage from './pages/Login'
import CommandCenter from './pages/CommandCenter'
import Pipeline from './pages/Pipeline'
import Leads from './pages/Leads'
import Signals from './pages/Signals'
import ForecastLoss from './pages/ForecastLoss'
import PipelineHealth from './pages/PipelineHealth'
import Automations from './pages/Automations'
import N8nEngine from './pages/N8nEngine'
import Battlecard from './pages/Battlecard'
import Analytics from './pages/Analytics'
import Inbox from './pages/Inbox'
import Meetings from './pages/Meetings'
import Accounts from './pages/Accounts'
import Contacts from './pages/Contacts'
import Campaigns from './pages/Campaigns'
import ChannelDeals from './pages/ChannelDeals'
import Documents from './pages/Documents'
import ProductIntelligence from './pages/ProductIntelligence'
import InvestorPipeline from './pages/InvestorPipeline'
import FraudMap from './pages/FraudMap'
import Meddpicc from './pages/Meddpicc'
import SdrHub from './pages/SdrHub'
import AdminLogs from './pages/AdminLogs'

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Layout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<CommandCenter />} />
                  <Route path="pipeline" element={<Pipeline />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="signals" element={<Signals />} />
                  <Route path="forecast" element={<ForecastLoss />} />
                  <Route path="loss-intelligence" element={<ForecastLoss />} />
                  <Route path="pipeline-health" element={<PipelineHealth />} />
                  <Route path="automations" element={<Automations />} />
                  <Route path="n8n" element={<N8nEngine />} />
                  <Route path="battlecard" element={<Battlecard />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="inbox" element={<Inbox />} />
                  <Route path="meetings" element={<Meetings />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="contacts" element={<Contacts />} />
                  <Route path="campaigns" element={<Campaigns />} />
                  <Route path="channel-deals" element={<ChannelDeals />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="product-intelligence" element={<ProductIntelligence />} />
                  <Route path="investor" element={<InvestorPipeline />} />
                  <Route path="fraud" element={<FraudMap />} />
                  <Route path="meddpicc" element={<Meddpicc />} />
                  <Route path="sdr-hub" element={<SdrHub />} />
                  <Route path="hubspot" element={<Pipeline />} />
                  <Route path="admin" element={<AdminLogs />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </I18nProvider>
  )
}
