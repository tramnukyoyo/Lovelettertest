/**
 * AdSense loader (game-client variant) — injects the adsbygoogle script on
 * demand. Deliberately NOT a static <script> in index.html: it is only
 * injected for players who may actually see ads (non-premium; on the big
 * screen only when NO premium player is in the room), so premium rooms stay
 * completely ad-script-free. Canonical copy of the platform's
 * Gamebuddies.Io/client/src/services/adsenseLoader.ts, simplified for games.
 */
import { ADSENSE_ENABLED, ADSENSE_PUBLISHER_ID } from '../config/adsense';

let injected = false;

export function loadAdSense(): void {
  if (injected) return;
  if (!ADSENSE_ENABLED) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (ADSENSE_PUBLISHER_ID.includes('XXXX')) return; // placeholder guard — never ship without a real ID

  injected = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export function isAdSenseLoaded(): boolean {
  return injected;
}
