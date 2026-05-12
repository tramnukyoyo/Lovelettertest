import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path matches DB ID for GameBuddies reverse proxy
  base: '/primesuspect/',
  plugins: [
    react(),
    // Polyfill Buffer/process/events for simple-peer in the browser
    nodePolyfills({
      include: ['buffer', 'process', 'events', 'stream', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  server: {
    port: 5180,
    host: true,
  },
  // The esbuild dep pre-bundling step crashes on the three.js +
  // react-three-fiber + drei + postprocessing + mediapipe graph (the
  // child process dies with "The service was stopped"). On Vite 7.1.x
  // this surfaces as a silent exit code 0 — confusing to debug. The
  // workaround is to exclude these heavy packages from pre-bundling so
  // Vite fetches them at request time instead. No runtime impact;
  // production `vite build` is unaffected because that uses Rollup.
  optimizeDeps: {
    exclude: [
      '@mediapipe/tasks-vision',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'three',
      'three-stdlib',
    ],
  },
  esbuild: mode === 'production'
    ? { drop: ['debugger'], pure: [] }  // DEBUG: console output enabled for production debugging
    : {},
  build: {
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
  },
}))
