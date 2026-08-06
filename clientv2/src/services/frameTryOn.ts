/**
 * Frame try-on — a tiny shared preview of the frame the LOCAL player is trying
 * on (or about to equip) in the roster picker.
 *
 * The roster picker only rings its OWN avatar during a preview; the owner wants
 * the preview to show on EVERY own-player surface at once — the rail row, the
 * big lobby crew card, and the presence-dock chip. This store lets those
 * surfaces mirror the picker's preview without prop-drilling through the shell.
 * (Fleet copy of SUSD/clientv2 `services/frameTryOn.ts` — kept generic so the
 * three identity surfaces stay in sync across every game.)
 *
 * Value contract (read by the own-player surfaces):
 *   undefined → no preview active (surface uses its equipped/profile frame)
 *   null      → previewing "None" (force the surface unframed)
 *   'frame_x' → previewing that frame id
 */

import { useSyncExternalStore } from 'react';

let preview: string | null | undefined = undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Set the active own-player frame preview (undefined clears it). */
export function setFrameTryOn(frameId: string | null | undefined): void {
  if (preview === frameId) return;
  preview = frameId;
  emit();
}

/** Clear the preview so surfaces fall back to their equipped/profile frame. */
export function clearFrameTryOn(): void {
  setFrameTryOn(undefined);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null | undefined {
  return preview;
}

/** React hook: the local player's active frame preview (undefined = none). */
export function useFrameTryOn(): string | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
