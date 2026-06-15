import { createRoot } from 'react-dom/client';
import App from './App';
import './fonts.css';
import './styles/index.css';
// Prime Suspect: the self-contained game brings its own class library (unified.css)
// plus a Paper Deduction theme that overrides the shared token surface. Loaded
// AFTER styles/index.css so the game classes + theme tokens win.
import './prime-suspect.css';

// Register service worker for PWA support (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/primesuspect/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// Note: StrictMode removed to prevent socket double-connection issues
// React StrictMode causes useEffect to run twice in development, which
// interferes with WebSocket connections
createRoot(document.getElementById('root')!).render(<App />);
