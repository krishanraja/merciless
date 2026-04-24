import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          stripe: ['@stripe/stripe-js'],
          // html2canvas is only used by ShareCard — already auto-splits,
          // but pinning here keeps the name stable for long-term caching.
          html2canvas: ['html2canvas'],
        },
      },
    },
  },
})
