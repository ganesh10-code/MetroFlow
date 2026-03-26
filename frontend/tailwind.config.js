/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          deep: '#080B1F',
          surface: '#1A1C3D',
          card: '#3A3F7A',
        },
        metro: {
          primary: '#00F2FF',
          secondary: '#00D2C8',
          glow: '#7D7DBE',
          dark: '#0c4a6e',
        },
        text: {
          primary: '#E6E9FF',
          secondary: '#B8BCE6',
          muted: '#7D7DBE',
        },
        status: {
          green: '#10B981',
          yellow: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
          purple: '#8B5CF6',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'premium': '0 20px 40px -12px rgba(0, 0, 0, 0.5)',
        'glow-cyan': '0 0 30px rgba(0, 242, 255, 0.2)',
        'glow-teal': '0 0 20px rgba(0, 210, 200, 0.25)',
        'inner-glow': 'inset 0 0 20px rgba(0, 242, 255, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 242, 255, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(0, 242, 255, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}