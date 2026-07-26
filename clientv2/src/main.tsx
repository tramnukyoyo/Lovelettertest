import { createRoot } from 'react-dom/client';
import App from './App';
import { installStaleChunkGuard } from './services/staleChunkGuard';
import './fonts.css';
import './styles/index.css';
// Prime Suspect: the self-contained game brings its own class library (unified.css)
// plus a Paper Deduction theme that overrides the shared token surface. Loaded
// AFTER styles/index.css so the game classes + theme tokens win.
import './prime-suspect.css';

// Before the first lazy import, so a post-deploy chunk 404 self-heals.
installStaleChunkGuard();

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
createRoot(document.getElementById('root')!).render(<App />);
