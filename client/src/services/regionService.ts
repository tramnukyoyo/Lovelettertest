/**
 * Region detection service for multi-region deployment
 *
 * Detects the fastest server by measuring actual latency to both regions.
 * No external API needed - uses your own server health endpoints.
 */

import { SERVERS } from '../config/servers';
import type { Region } from '../config/servers';

let cachedRegion: Region | null = null;

async function measureLatency(serverUrl: string): Promise<number> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    return performance.now() - start;
  } catch {
    return Infinity;
  }
}

export async function detectFastestRegion(): Promise<Region> {
  console.log('[Region] detectFastestRegion() called, cached:', cachedRegion);
  if (cachedRegion) return cachedRegion;

  console.log('[Region] Measuring server latency...');

  const [usLatency, euLatency] = await Promise.all([
    measureLatency(SERVERS.us),
    measureLatency(SERVERS.eu),
  ]);

  console.log(`[Region] US latency: ${usLatency.toFixed(0)}ms, EU latency: ${euLatency.toFixed(0)}ms`);

  if (usLatency === Infinity && euLatency === Infinity) {
    console.warn('[Region] Both servers unreachable, defaulting to EU');
    cachedRegion = 'eu';
  } else {
    cachedRegion = usLatency < euLatency ? 'us' : 'eu';
  }

  console.log(`[Region] Selected: ${cachedRegion}`);
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
  console.log(`[Region] Manually set to: ${region}`);
}
