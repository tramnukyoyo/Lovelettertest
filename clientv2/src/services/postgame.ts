/**
 * Post-game store: shared rewards summary + rematch vote state.
 *
 * Fed by the game server's cross-game events (`gb:postgame:summary`,
 * `gb:postgame:rematch-update`, `gb:postgame:rematch-go`) registered in
 * App.tsx. Kept outside lobby state (room-state broadcasts replace that
 * wholesale). The results overlay reads it via usePostgame().
 */

import { useSyncExternalStore } from 'react';

export interface PostgameRewardEntry {
  playerId: string;
  playerName: string;
  totalXp: number;
  gabuPoints: number;
  leveledUp: boolean;
  newLevel: number | null;
  achievements: Array<{ id: string; name: string; icon_url?: string | null; rarity?: string }>;
}

export interface PostgameUnlock {
  playerId: string;
  playerName: string;
  achievement: { id: string; name: string; description?: string; iconUrl?: string | null; rarity?: string };
}

export interface PostgameState {
  rewards: PostgameRewardEntry[];
  rematch: { votes: number; needed: number; voters: string[] } | null;
  rematchGo: boolean;
  crewStreak: { gamesTonight: number; weekStreak: number } | null;
  unlocks: PostgameUnlock[];
}

const initialState: PostgameState = { rewards: [], rematch: null, rematchGo: false, crewStreak: null, unlocks: [] };
let state: PostgameState = initialState;
const listeners = new Set<() => void>();

function set(next: Partial<PostgameState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function setPostgameRewards(rewards: PostgameRewardEntry[]): void {
  set({ rewards });
}

export function setRematchState(rematch: PostgameState['rematch']): void {
  set({ rematch });
}

export function setRematchGo(): void {
  set({ rematchGo: true });
}

export function setCrewStreak(crewStreak: PostgameState['crewStreak']): void {
  set({ crewStreak });
}

export function addUnlock(unlock: PostgameUnlock): void {
  if (state.unlocks.some(u => u.playerId === unlock.playerId && u.achievement.id === unlock.achievement.id)) return;
  set({ unlocks: [...state.unlocks, unlock] });
}

export function resetPostgame(): void {
  if (state === initialState) return;
  state = initialState;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PostgameState {
  return state;
}

export function usePostgame(): PostgameState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
