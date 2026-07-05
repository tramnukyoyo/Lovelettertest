/**
 * Reverse asset prefetch: warm the platform lobby's hashed JS/CSS while the
 * player is still on the post-game screen, so the Return-to-Lobby full-page
 * navigation paints from HTTP cache. Mirror of the platform's
 * lib/gamePrefetch.ts (which warms game assets on selection) in the opposite
 * direction — games are served same-origin under gamebuddies.io/<gameId>/,
 * so fetching `/` returns the platform SPA shell.
 *
 * Best-effort: failures are swallowed, runs once per page load. Only the
 * eager entry assets appear in the HTML (lazy chunks like RoomLobby hash-load
 * later), but the entry bundle is the bulk of the return-path bytes.
 */

import { isDiscordActivity } from './discordActivity';

let prefetched = false;

const ASSET_REGEX = /(?:src|href)="([^"]+\.(?:js|css))"/g;
const MAX_PREFETCH_ASSETS = 10;

export async function prefetchLobbyAssets(): Promise<void> {
  if (prefetched) return;
  prefetched = true;

  // Inside Discord the platform shell is not reachable same-origin; in dev
  // there are no hashed assets to warm.
  if (isDiscordActivity() || import.meta.env.DEV) return;

  try {
    const res = await fetch('/', {
      headers: { accept: 'text/html' },
      credentials: 'omit',
    });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) return;
    const html = await res.text();

    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = ASSET_REGEX.exec(html)) !== null && seen.size < MAX_PREFETCH_ASSETS) {
      const url = match[1];
      // Same-origin, absolute-path assets only (skip CDNs and relative paths —
      // relative would resolve under this game's base, not the platform root).
      if (/^https?:\/\//i.test(url) || url.startsWith('//') || !url.startsWith('/')) continue;
      if (seen.has(url)) continue;
      seen.add(url);

      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = url.endsWith('.css') ? 'style' : 'script';
      link.href = url;
      document.head.appendChild(link);
    }

    if (seen.size > 0) {
      console.log(`[LobbyPrefetch] Warmed platform lobby: ${seen.size} asset(s)`);
    }
  } catch {
    // Best-effort only.
  }
}
