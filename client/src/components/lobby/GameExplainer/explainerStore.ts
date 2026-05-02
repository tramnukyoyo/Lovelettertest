import { useSyncExternalStore } from 'react';

/**
 * Per-gameId external store coordinating the modal-open state across the
 * orchestrator, sidebar, and help button. Each gameId has its own boolean —
 * useful when a single React tree hosts more than one explainer (rare, but
 * cheap to support).
 */
const states: Map<string, boolean> = new Map();
const listeners: Map<string, Set<() => void>> = new Map();

function getOrCreateListenerSet(gameId: string): Set<() => void> {
  let set = listeners.get(gameId);
  if (!set) {
    set = new Set();
    listeners.set(gameId, set);
  }
  return set;
}

function emit(gameId: string): void {
  const set = listeners.get(gameId);
  if (set) for (const l of set) l();
}

export function openExplainer(gameId: string): void {
  if (states.get(gameId) === true) return;
  states.set(gameId, true);
  emit(gameId);
}

export function closeExplainer(gameId: string): void {
  if (states.get(gameId) !== true) return;
  states.set(gameId, false);
  emit(gameId);
}

export function useExplainerOpen(gameId: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const set = getOrCreateListenerSet(gameId);
      set.add(cb);
      return () => { set.delete(cb); };
    },
    () => states.get(gameId) ?? false,
    () => false,
  );
}
