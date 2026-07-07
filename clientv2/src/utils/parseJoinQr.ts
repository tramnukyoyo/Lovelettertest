/**
 * Parse the contents of a scanned QR code into a join action.
 *
 * Accepted payloads (in priority order):
 *  1. Bare room code: `^[A-Za-z0-9]{4,8}$`
 *  2. A GameBuddies URL (this game's origin, gamebuddies.io, or a subdomain)
 *     carrying `?room=` / `?join=` / `?invite=` — the same params HomePage
 *     already consumes. >10 chars = streamer-mode invite token (matches the
 *     HomePage heuristic).
 *
 * Anything else — foreign origins especially — is rejected. The scanner must
 * NEVER navigate to or act on an arbitrary URL.
 */

export type ParsedJoinQr =
  | { type: 'room'; roomCode: string }
  | { type: 'invite'; token: string }
  | { type: 'reject' };

const ROOM_CODE_RE = /^[A-Za-z0-9]{4,8}$/;

export function parseJoinQr(raw: string, currentHostname?: string): ParsedJoinQr {
  const text = (raw || '').trim();
  if (!text) return { type: 'reject' };

  // 1. Bare room code
  if (ROOM_CODE_RE.test(text)) {
    return { type: 'room', roomCode: text.toUpperCase() };
  }

  // 2. GameBuddies URL
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { type: 'reject' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { type: 'reject' };

  const host = url.hostname.toLowerCase();
  const ownHost = (currentHostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  const isTrusted =
    (!!ownHost && host === ownHost) ||
    host === 'gamebuddies.io' ||
    host === 'www.gamebuddies.io' ||
    host.endsWith('.gamebuddies.io') ||
    host === 'localhost';
  if (!isTrusted) return { type: 'reject' };

  const value = url.searchParams.get('room') || url.searchParams.get('join') || url.searchParams.get('invite');
  if (!value) return { type: 'reject' };

  if (value.length > 10) return { type: 'invite', token: value };
  if (ROOM_CODE_RE.test(value)) return { type: 'room', roomCode: value.toUpperCase() };
  return { type: 'reject' };
}
