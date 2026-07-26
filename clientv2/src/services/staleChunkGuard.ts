import { isDiscordActivity } from './discordActivity';

/**
 * One-shot reload when a lazy chunk 404s after a deploy.
 *
 * A tab opened before a deploy holds an index.html that references the old
 * hashed asset names. The moment it lazy-loads a route or component, that
 * chunk is gone and the import rejects — the user gets a dead click or a
 * blank panel with no indication that reloading would fix it.
 *
 * The platform client has handled this in its ErrorBoundary since earlier;
 * no game client did (fleet audit 2026-07-26: ~85 occurrences / ~25 users in
 * 14 days, the largest single client-exception cluster). A boundary alone is
 * not enough anyway: an `import()` fired from a click handler rejects as an
 * unhandled promise and never reaches React.
 *
 * `vite:preloadError` is Vite's own signal for exactly this and fires
 * regardless of how the browser words the underlying network error, which is
 * why it is the primary trigger. The message patterns below are a fallback for
 * rejections that never went through Vite's preload helper. Deliberately
 * absent: bare "Failed to fetch" / "Load failed" — those are generic network
 * errors and reloading on them would turn a flaky API call into a reload loop.
 */

const RELOAD_KEY = 'gb-stale-chunk-reload';

const STALE_CHUNK_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

function isStaleChunkMessage(message: string): boolean {
  return STALE_CHUNK_PATTERNS.some((re) => re.test(message));
}

function reloadOnce(): void {
  // Inside a Discord Activity a hard reload unloads the Activity entry document
  // and churns the host session — never reload there.
  if (isDiscordActivity()) return;
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    // No sessionStorage (private mode) means no way to remember we already
    // tried, and an unguarded reload would loop. Leave the page alone.
    return;
  }
  console.warn('[staleChunkGuard] stale chunk after deploy — reloading once');
  window.location.reload();
}

export function installStaleChunkGuard(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault(); // stop Vite rethrowing into an unhandled rejection
    reloadOnce();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: unknown; name?: unknown } | undefined;
    const message = String(reason?.message ?? reason ?? '');
    if (reason?.name === 'ChunkLoadError' || isStaleChunkMessage(message)) {
      reloadOnce();
    }
  });
}
