/**
 * Discord Activity detection for Prime Suspect (HeartsGambit).
 *
 * When launched from the GameBuddies platform hub inside a Discord Activity, the game
 * runs in a nested iframe served at `<app_id>.discordsays.com/<gameid>`. Inside that
 * sandbox every absolute cross-origin URL is CSP-blocked, so all backend traffic must
 * be same-origin and route through Discord's URL Mappings (`/.proxy/gs` → shared
 * gameserver, root `/` → gamebuddies.io). The game joins via the `?session=` token the
 * platform mints, so no standalone Discord SDK auth is needed here — only the detector.
 */
export function isDiscordActivity(): boolean {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.has('frame_id') || p.has('instance_id')) return true;
    return typeof window !== 'undefined' && window.location.host.endsWith('.discordsays.com');
  } catch {
    return false;
  }
}
