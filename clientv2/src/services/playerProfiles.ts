/**
 * Player platform-profile store.
 *
 * Profiles (level, GabuPoints, streak, cosmetics, achievements) arrive async
 * from the game server via the `gb:player:profile` socket event. They are kept
 * OUTSIDE the lobby state on purpose: room-state broadcasts fully replace the
 * player list, which would wipe any profile merged into it. Components read
 * profiles by platform player id via usePlayerProfile().
 */

import { useSyncExternalStore } from 'react';
import type { PlayerPlatformProfile } from '../types/base';

let profiles: Record<string, PlayerPlatformProfile> = {};
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

export function setPlayerProfile(playerId: string, profile: PlayerPlatformProfile): void {
  profiles = { ...profiles, [playerId]: profile };
  emitChange();
}

export function clearPlayerProfiles(): void {
  if (Object.keys(profiles).length === 0) return;
  profiles = {};
  emitChange();
}

export function getPlayerProfile(playerId: string | undefined): PlayerPlatformProfile | undefined {
  return playerId ? profiles[playerId] : undefined;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Record<string, PlayerPlatformProfile> {
  return profiles;
}

/** React hook: the profile for one player (re-renders when it arrives/changes). */
export function usePlayerProfile(playerId: string | undefined): PlayerPlatformProfile | undefined {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return playerId ? all[playerId] : undefined;
}
