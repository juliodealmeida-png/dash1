import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        card: '#1e293b',
        'card-hover': '#263347',
        border: 'rgba(255,255,255,0.08)',
        'text-primary': '#f1f5f9',
        'text-muted': '#94a3b8',
        'text-dim': '#64748b',
        accent: '#7c3aed',
        'accent-light': '#a78bfa',
        cyan: '#06b6d4',
        green: '#34d399',
        orange: '#fb923c',
        red: '#f87171',
        yellow: '#fbbf24',
      },
    },
  },
  plugins: [],
} satisfies Config
