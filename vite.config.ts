import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'react'
            if (id.includes('/react-dom/') || id.includes('/react/')) return 'react'
            if (id.includes('@supabase/supabase-js')) return 'supabase'
            if (id.includes('@stripe/stripe-js')) return 'stripe'
            if (id.includes('html2canvas')) return 'html2canvas'
          }
        },
      },
    },
  },
})
