import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Phones in EITHER orientation: narrow (portrait) OR wide-but-short
 * (landscape). Landscape phones are 844-932px wide, so a width-only query
 * misses them and they'd get the desktop layout squeezed into ~400px of
 * height. The max-width:1023px arm keeps short desktop windows >=1024px on
 * the desktop layout.
 *
 * MUST stay byte-identical to the media queries tagged "COMPACT_MEDIA_QUERY"
 * in shell.css — the CSS styles the markup this flag renders.
 */
export const COMPACT_MEDIA_QUERY =
  '(max-width: 767px), (orientation: landscape) and (max-height: 500px) and (max-width: 1023px)';

/**
 * The shell/lobby compact regime (ported from the platform hub's RoomLobby,
 * responsive audit 2026-07-09 R2A):
 * - `(max-width: 1023px)`: matches the existing shell seam (rail hide /
 *   hamburger at <=1023.98px) so JS and CSS agree at every boundary. The old
 *   width-only hook said "mobile" at exactly 1024px while the CSS rendered
 *   the desktop board - that hybrid is the bug this port fixes.
 * - `(pointer: coarse)`: touch devices >=1024px (iPad landscape, iPad Air)
 *   got the squeezed desktop board with mouse-sized targets. Touch always
 *   gets the compact regime; the desktop board is pointer-fine-only.
 *
 * MUST stay byte-identical to the media queries tagged
 * "LOBBY_COMPACT_MEDIA_QUERY" in shell.css, mobile-menu.css and lobby.css,
 * whose desktop blocks are gated on the exact complement:
 *   (min-width: 1024px) and (pointer: fine), (min-width: 1024px) and (pointer: none)
 */
export const LOBBY_COMPACT_MEDIA_QUERY = '(max-width: 1023px), (pointer: coarse)';

/**
 * Phone LANDSCAPE only — drives the lobby's chrome auto-hide (header hidden,
 * reveal pill). MUST stay byte-identical to the "PHONE LANDSCAPE" arm in
 * shell.css and to the second arm of COMPACT_MEDIA_QUERY above.
 */
export const PHONE_LANDSCAPE_MEDIA_QUERY =
  '(orientation: landscape) and (max-height: 500px) and (max-width: 1023px)';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

export function useIsCompact(): boolean {
  return useMediaQuery(COMPACT_MEDIA_QUERY);
}

export function useIsLobbyCompact(): boolean {
  return useMediaQuery(LOBBY_COMPACT_MEDIA_QUERY);
}

export function useIsPhoneLandscape(): boolean {
  return useMediaQuery(PHONE_LANDSCAPE_MEDIA_QUERY);
}

export default useIsMobile;
