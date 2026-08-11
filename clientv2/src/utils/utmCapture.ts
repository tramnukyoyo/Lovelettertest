/**
 * utmCapture — first-touch UTM capture for game clients (fleet-canonical).
 *
 * Game clients run same-origin with the platform (gamebuddies.io/<slug>/), so
 * writing the SAME localStorage bundle the platform uses (`gb_utm`, see
 * Gamebuddies.Io client/src/hooks/useUtmCapture.ts) means an invitee who lands
 * directly in a game via a tagged invite link (?room=CODE&utm_source=invite...)
 * carries that attribution into the platform: when they later sign up there,
 * the existing pipeline (gb_utm -> users.metadata.acquisition ->
 * kpi_user_first_seen.utm_*) picks it up with zero server changes.
 *
 * Keep format + key in sync with the platform hook. First-touch wins; 30d TTL.
 */

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const STORAGE_KEY = 'gb_utm';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_VALUE_LEN = 200;

interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  captured_at?: number;
  landing_path?: string;
}

function hostOf(url: string): string | null {
  try { return new URL(url).host; } catch { return null; }
}

/** Call once at app boot. Idempotent; never throws. */
export function captureUtmFromUrl(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = JSON.parse(raw) as UtmData;
      if (existing.captured_at && Date.now() - existing.captured_at <= TTL_MS) {
        return; // first-touch wins — don't clobber
      }
      localStorage.removeItem(STORAGE_KEY);
    }

    const params = new URLSearchParams(window.location.search);
    const captured: UtmData = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v && v.length > 0 && v.length <= MAX_VALUE_LEN) captured[k] = v;
    }

    const ref = document.referrer || '';
    if (ref && hostOf(ref) !== window.location.host) {
      captured.referrer = ref.slice(0, MAX_VALUE_LEN);
    }

    if (Object.keys(captured).length === 0) return;
    captured.captured_at = Date.now();
    captured.landing_path = window.location.pathname.slice(0, MAX_VALUE_LEN);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
  } catch { /* storage unavailable — attribution is best-effort */ }
}
