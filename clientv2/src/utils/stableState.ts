/**
 * Structural sharing for the lobby state object.
 *
 * Every roomStateUpdated / roomStateDelta broadcast replaces the entire lobby
 * object, so child components lose reference identity on every update even
 * when their slice (players list, settings, …) didn't change — which makes
 * React.memo useless and re-renders the whole tree (chat, player list, video
 * filmstrip) on every timer tick.
 *
 * stabilizeLobby() reuses the previous object's references for any top-level
 * key that is deep-equal to the new value (and item-wise for the players
 * array), so unchanged slices keep their identity and memoized children skip
 * re-rendering. Lobby payloads are small (a few kB), so the deep compare is
 * negligible next to the avoided render work.
 */

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const arrB = b as unknown[];
    if (a.length !== arrB.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], arrB[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }
  return true;
}

/**
 * Return `next` but with references reused from `prev` wherever a top-level
 * slice is deep-equal. Arrays additionally reuse equal items element-wise
 * (players list usually changes one entry, not all of them).
 */
export function stabilize<T extends Record<string, unknown>>(prev: T | null | undefined, next: T): T {
  if (!prev) return next;
  if (deepEqual(prev, next)) return prev;

  const out: Record<string, unknown> = { ...next };
  for (const key of Object.keys(next)) {
    const prevVal = prev[key];
    const nextVal = next[key];
    if (prevVal === nextVal) continue;
    if (deepEqual(prevVal, nextVal)) {
      out[key] = prevVal;
    } else if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
      out[key] = nextVal.map((item, i) =>
        i < prevVal.length && deepEqual(prevVal[i], item) ? prevVal[i] : item
      );
    }
  }
  return out as T;
}
