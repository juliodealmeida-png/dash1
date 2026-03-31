import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const PROD_API = 'https://guardline-engine-production.up.railway.app/api'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    ...(mode === 'production' && {
      'import.meta.env.VITE_API_BASE': JSON.stringify(
        process.env.VITE_API_BASE || PROD_API
      ),
    }),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}))
