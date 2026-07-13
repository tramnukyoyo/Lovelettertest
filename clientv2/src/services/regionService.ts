/**
 * Region detection service for multi-region deployment
 *
 * Detects the fastest server by measuring actual latency to both regions.
 * No external API needed - uses your own server health endpoints.
 */

import { SERVERS } from '../config/servers';
import type { Region } from '../config/servers';

let cachedRegion: Region | null = null;

// Cross-navigation region handoff. The platform lobby (same origin — games are
// proxied under gamebuddies.io/<gameId>/) probes both regions on game selection
// and writes the winner here, so the game boot can skip its own 2x health
// probes (up to 3s serialized before the socket can open). The game also
// writes its own probe result so game->lobby->game relaunches stay warm.
const REGION_CACHE_KEY = 'gb:region:v1';
const REGION_CACHE_TTL_MS = 30 * 60 * 1000;

interface RegionCacheEntry {
  region: Region;
  servers: Record<Region, string>;
  ts: number;
}

function readRegionCache(): Region | null {
  try {
    const raw = sessionStorage.getItem(REGION_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as RegionCacheEntry;
    if (!entry || (entry.region !== 'us' && entry.region !== 'eu')) return null;
    if (Date.now() - entry.ts > REGION_CACHE_TTL_MS) return null;
    // Only trust a cache written against the same server pair this build would
    // probe — a game with a VITE_BACKEND_URL override must not inherit the
    // platform's choice between different hosts.
    if (entry.servers?.us !== SERVERS.us || entry.servers?.eu !== SERVERS.eu) return null;
    return entry.region;
  } catch {
    return null;
  }
}

function writeRegionCache(region: Region): void {
  try {
    const entry: RegionCacheEntry = {
      region,
      servers: { us: SERVERS.us, eu: SERVERS.eu },
      ts: Date.now(),
    };
    sessionStorage.setItem(REGION_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage blocked/full — next load probes again.
  }
}

// Room→region pin: the platform appends ?gbRegion=eu|us to every game URL it
// builds (start, late-join, session links), carrying the ROOM's pinned region.
// All players of a room must land on the same regional server — an individual
// client's latency preference must never override the room's pin, so this
// beats the sessionStorage handoff AND the probe race.
function readUrlRegionPin(): Region | null {
  try {
    const value = new URLSearchParams(window.location.search).get('gbRegion');
    return value === 'us' || value === 'eu' ? value : null;
  } catch {
    return null;
  }
}

async function measureLatency(serverUrl: string): Promise<number> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    // A reachable-but-broken host (404/5xx — e.g. a decommissioned server
    // whose edge still answers fast) must not win the race.
    if (!res.ok) return Infinity;
    return performance.now() - start;
  } catch {
    return Infinity;
  }
}

export async function detectFastestRegion(): Promise<Region> {
  const urlPin = readUrlRegionPin();
  if (urlPin) {
    if (cachedRegion !== urlPin) {
      console.log(`[Region] Pinned to ${urlPin.toUpperCase()} by gbRegion URL param (room pin)`);
    }
    cachedRegion = urlPin;
    writeRegionCache(urlPin);
    return cachedRegion;
  }

  if (cachedRegion) return cachedRegion;

  const handoff = readRegionCache();
  if (handoff) {
    console.log(`[Region] Using ${handoff.toUpperCase()} from sessionStorage handoff (no probe)`);
    cachedRegion = handoff;
    return cachedRegion;
  }

  const [usLatency, euLatency] = await Promise.all([
    measureLatency(SERVERS.us),
    measureLatency(SERVERS.eu),
  ]);


  if (usLatency === Infinity && euLatency === Infinity) {
    console.warn('[Region] Both servers unreachable, defaulting to EU');
    cachedRegion = 'eu';
    // Deliberately not cached: an offline blip must not pin EU for 30 minutes.
  } else {
    cachedRegion = usLatency < euLatency ? 'us' : 'eu';
    writeRegionCache(cachedRegion);
  }

  return cachedRegion;
}

export function getCachedRegion(): Region {
  return cachedRegion || 'eu';
}

export function clearCachedRegion(): void {
  cachedRegion = null;
}

export function setRegion(region: Region): void {
  cachedRegion = region;
}
