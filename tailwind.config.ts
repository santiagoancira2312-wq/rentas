import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:    { DEFAULT: '#0f1729', soft: '#3d4759', mute: '#7b849b' },
        canvas: '#f4f5f8',
        line:   '#e4e7ee',
        brand:  { 50:'#eef1ff',100:'#dfe4ff',200:'#c3cbff',400:'#7c88f0',
                  500:'#4f5bd5',600:'#3f4ab5',700:'#333c93' },
        good:   { 50:'#e7f7ee',100:'#c8ecd8',500:'#12a45c',600:'#0d8449' },
        warn:   { 50:'#fff4e3',100:'#ffe4bd',500:'#ef8a15',600:'#c96f0b' },
        bad:    { 50:'#fdebeb',100:'#fbd2d1',500:'#df413b',600:'#bb302b' },
        info:   { 50:'#e6f6fb',100:'#c2e9f5',500:'#0d94b8',600:'#0a7794' },
      },
      fontFamily: {
        // Pila del sistema: se ve nativa en cada plataforma y no añade descargas.
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI',
               'Roboto', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,41,.04), 0 8px 24px -12px rgba(15,23,41,.12)',
        pop:  '0 12px 48px -12px rgba(15,23,41,.28)',
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(16px)', opacity: '.5' },
                      to:   { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        'fade-in':  'fade-in .18s ease-out',
        'slide-up': 'slide-up .24s cubic-bezier(.32,.72,0,1)',
      },
    },
  },
  plugins: [],
} satisfies Config
