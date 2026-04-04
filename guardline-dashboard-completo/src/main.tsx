import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { FiltersProvider } from './contexts/FiltersContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import 'leaflet/dist/leaflet.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FiltersProvider>
        <RealtimeProvider>
          <App />
        </RealtimeProvider>
      </FiltersProvider>
    </AuthProvider>
  </StrictMode>,
)
