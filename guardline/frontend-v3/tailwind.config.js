/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f1220',
        card: '#131728',
        elevated: '#1a1f35',
        border: {
          DEFAULT: '#1e2540',
          subtle: '#1a2040',
          strong: '#2a3255',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#475569',
        },
        accent: {
          purple: '#7c3aed',
          'purple-light': '#9d5cf5',
          cyan: '#06b6d4',
          red: '#ef4444',
          amber: '#f59e0b',
          green: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.4s ease',
        'pulse-critical': 'pulseCritical 2.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseCritical: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
