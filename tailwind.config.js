/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        graphite: {
          50: '#f6f7f9', 100: '#eceef2', 200: '#d5d9e2', 300: '#b0b8c8', 400: '#8592a9',
          500: '#66738e', 600: '#515c75', 700: '#424b5f', 800: '#2a303d', 850: '#1c212b',
          900: '#141820', 950: '#0b0e13',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(251,146,60,.25), 0 8px 30px -6px rgba(249,115,22,.35)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 10px 30px -12px rgba(0,0,0,.45)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(239,68,68,.55)' },
          '70%': { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        },
        shimmer: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(.4,0,.6,1) infinite',
        shimmer: 'shimmer 6s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
