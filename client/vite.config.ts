import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path matches DB ID for GameBuddies reverse proxy
  base: '/primesuspect/',
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
  },
  esbuild: mode === 'production'
    ? { drop: ['debugger'], pure: ['console.log', 'console.debug', 'console.warn', 'console.error'] }
    : {},
  build: {
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
  },
}))
