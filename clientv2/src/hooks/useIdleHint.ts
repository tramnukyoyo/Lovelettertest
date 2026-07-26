/**
 * useIdleHint — returns true after `delayMs` of `active` being continuously
 * true. Used to pulse the primary action a player is expected to press to
 * proceed when they haven't found it yet. Resets whenever `active` goes false
 * or `resetKey` changes (new round / new question).
 *
 * Ported verbatim from SchoolQuizGame/clientv3/src/hooks/useIdleHint.ts —
 * keep every copy in sync.
 */

import { useEffect, useState } from 'react';

export function useIdleHint(active: boolean, delayMs = 10000, resetKey?: unknown): boolean {
  const [hint, setHint] = useState(false);

  useEffect(() => {
    setHint(false);
    if (!active) return;
    const timer = setTimeout(() => setHint(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs, resetKey]);

  return hint;
}
