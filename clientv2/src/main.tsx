import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/core/ErrorBoundary';
import { installStaleChunkGuard } from './services/staleChunkGuard';
import { captureUtmFromUrl } from './utils/utmCapture';
import './fonts.css';
import './styles/index.css';
// Prime Suspect: the self-contained game brings its own class library (unified.css)
// plus a Paper Deduction theme that overrides the shared token surface. Loaded
// AFTER styles/index.css so the game classes + theme tokens win.
import './prime-suspect.css';

// Before the first lazy import, so a post-deploy chunk 404 self-heals.
installStaleChunkGuard();

// First-touch attribution: invitees landing on tagged ?room= links carry
// utm_* into the shared gb_utm bundle the platform reads at signup.
captureUtmFromUrl();

// Register service worker for PWA support (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// Note: StrictMode removed to prevent socket double-connection issues
// React StrictMode causes useEffect to run twice in development, which
// interferes with WebSocket connections
// Root error boundary. Every client already shipped this component but none
// mounted it, so any render-time throw took the whole tree to a white screen
// instead of the reported, retryable panel it exists to show.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
