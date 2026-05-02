import { useCallback, useState } from 'react';

const KEY_PREFIX = 'gb-explainer-seen-';

/**
 * Tracks whether the local player has seen the explainer for a given gameId.
 * Read once on mount (synchronous, no flash). Only changes when markSeen() is
 * called explicitly.
 *
 * SSR / blocked localStorage: defaults to seen=true (don't nag).
 */
export function useFirstTimeTracker(gameId: string): {
  seen: boolean;
  markSeen: () => void;
} {
  const [seen, setSeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(KEY_PREFIX + gameId) === 'true';
    } catch {
      return true;
    }
  });

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(KEY_PREFIX + gameId, 'true');
    } catch { /* ignore */ }
    setSeen(true);
  }, [gameId]);

  return { seen, markSeen };
}
