import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT for GitHub Pages:
// If your repository is https://github.com/<user>/cm-event-leads
// then the site will be served from https://<user>.github.io/cm-event-leads/
// => set VITE_BASE_PATH=/cm-event-leads/ (the GitHub Action does this automatically).
// For local dev, Netlify or Vercel, leave it empty => '/'
export default defineConfig(() => {
  const base = process.env.VITE_BASE_PATH || '/'
  return {
    base,
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            // Keep the kiosk bundle small: React + Supabase load first,
            // SheetJS is a separate chunk fetched only when exporting.
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js']
          }
        }
      }
    },
    server: {
      port: 5173,
      host: true
    }
  }
})
