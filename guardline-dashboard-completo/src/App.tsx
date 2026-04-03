import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import CommandCenter from './pages/CommandCenter'
import Deals from './pages/Deals'
import Leads from './pages/Leads'
import Signals from './pages/Signals'
import Automations from './pages/Automations'
import Fraud from './pages/Fraud'
import Investor from './pages/Investor'
import Documents from './pages/Documents'
import Julio from './pages/Julio'
import Integrations from './pages/Integrations'
import Connectors from './pages/Connectors'
import Tools from './pages/Tools'
import Campaigns from './pages/Campaigns'
import Meetings from './pages/Meetings'
import Accounts from './pages/Accounts'
import Contacts from './pages/Contacts'
import Forum from './pages/Forum'
import WfExecutions from './pages/WfExecutions'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<CommandCenter />} />
          <Route path="deals" element={<Deals />} />
          <Route path="leads" element={<Leads />} />
          <Route path="signals" element={<Signals />} />
          <Route path="automations" element={<Automations />} />
          <Route path="fraud" element={<Fraud />} />
          <Route path="investor" element={<Investor />} />
          <Route path="documents" element={<Documents />} />
          <Route path="julio" element={<Julio />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="connectors" element={<Connectors />} />
          <Route path="tools" element={<Tools />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="forum" element={<Forum />} />
          <Route path="wf" element={<WfExecutions />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
