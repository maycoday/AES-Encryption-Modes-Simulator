/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#7C3AED',
        success: '#059669',
        danger: '#DC2626',
        warning: '#D97706',
        ecb: '#EA580C',
        cbc: '#2563EB',
        ctr: '#7C3AED',
        gcm: '#059669',
        surface: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { card: '12px' },
      boxShadow: { card: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px #E2E8F0' },
    },
  },
  plugins: [],
}
