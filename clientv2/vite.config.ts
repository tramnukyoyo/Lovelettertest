import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.CAPACITOR ? './' : (process.env.VITE_BASE_PATH ?? '/primesuspect/'),
  plugins: [
    react(),
    // Polyfill Buffer/process/events for simple-peer in the browser
    nodePolyfills({
      include: ['buffer', 'process', 'events', 'stream', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@mediapipe/tasks-vision/wasm/*',
          dest: 'wasm'
        }
      ]
    })
  ],
  server: {
    port: 5218,
    host: true,
  },
  esbuild: mode === 'production'
    ? { drop: ['debugger'], pure: [] }  // DEBUG: console output enabled for production debugging
    : {},
  build: {
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
  },
}))
