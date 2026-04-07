import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'merciless': {
          'black': '#0A0A0B',
          'card': '#111115',
          'border': '#1E1E24',
          'gold': '#F5A623',
          'gold-muted': '#C4831A',
          'violet': '#7B2FBE',
          'violet-light': '#9D4EDD',
          'white': '#F0EDE8',
          'muted': '#6B6B7A',
          'danger': '#E53E3E',
        }
      },
      fontFamily: {
        'space': ['"Space Grotesk"', 'sans-serif'],
      },
      animation: {
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'fade-slide-up': 'fadeSlideUp 0.6s ease-out forwards',
        'modal-fade-in': 'modalFadeIn 0.2s ease-out forwards',
        'modal-slide-up': 'modalSlideUp 0.3s ease-out forwards',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(245, 166, 35, 0)' },
        },
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
