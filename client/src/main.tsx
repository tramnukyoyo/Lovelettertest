console.log('🚀 [main.tsx] App starting...');

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/primesuspect/sw.js');
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

console.log('🚀 [main.tsx] Imports complete, rendering...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
