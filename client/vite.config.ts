import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Base path matches DB ID for GameBuddies reverse proxy
  base: '/heartsgambit/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    // Remove console logs and debugger statements in production
    minify: 'esbuild',
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
  },
})
