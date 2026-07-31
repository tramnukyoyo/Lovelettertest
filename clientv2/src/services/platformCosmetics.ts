/**
 * Platform identity-cosmetics store (avatar frames + username flairs).
 *
 * One GameBuddies-wide economy served by the CENTRAL gameserver handlers
 * `gb:cosmetics:list/buy/equip` → `gb:cosmetics:state`/`gb:cosmetics:result`
 * (same events in every game — this file is a verbatim fleet copy). The
 * catalog (names/prices) arrives IN the state payload from the platform's
 * single source of truth, so clients never carry price copies. Premium
 * players get every item included; equips write the same platform slot the
 * gamebuddies.io shop uses, so one equip shows everywhere.
 *
 * Kept OUTSIDE lobby state (like playerProfiles) so room-state broadcasts
 * can't wipe it. Equip results also arrive as a room-wide gb:player:profile
 * update — the roster/dock re-render via playerProfiles, not this store.
 */

import { useSyncExternalStore } from 'react';
import type { Socket } from 'socket.io-client';
import socketService from './socketService';

const LIST_EVENT = 'gb:cosmetics:list';
const STATE_EVENT = 'gb:cosmetics:state';
const BUY_EVENT = 'gb:cosmetics:buy';
const EQUIP_EVENT = 'gb:cosmetics:equip';
const RESULT_EVENT = 'gb:cosmetics:result';

export interface IdentityCatalogItem {
  id: string;
  name: string;
  costGp: number;
  rarity: string;
  premiumOnly?: boolean;
}

export interface PlatformCosmeticsState {
  status: 'idle' | 'loading' | 'ready' | 'guest' | 'error';
  /** GabuPoints balance (only meaningful when status === 'ready'). */
  balance: number;
  /** Player holds an active Premium tier (every item is included for them). */
  premium: boolean;
  /** Owned platform item ids per identity kind. */
  owned: { flair: string[]; frame: string[] };
  /** Currently equipped item id per identity kind (null = none). */
  equipped: { flair: string | null; frame: string | null };
  /** Catalog from the platform (names/prices) — empty until first state. */
  catalog: { flairs: IdentityCatalogItem[]; frames: IdentityCatalogItem[] };
  /** Item currently being bought/equipped (disables its button), or null. */
  busyItemId: string | null;
  /** Last buy/equip failure, surfaced inline ('' = none). */
  lastError: string;
}

const initial: PlatformCosmeticsState = {
  status: 'idle', balance: 0, premium: false,
  owned: { flair: [], frame: [] },
  equipped: { flair: null, frame: null },
  catalog: { flairs: [], frames: [] },
  busyItemId: null, lastError: '',
};

let state: PlatformCosmeticsState = initial;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

function patch(p: Partial<PlatformCosmeticsState>) {
  state = { ...state, ...p };
  emitChange();
}

function idList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function catalogList(v: unknown): IdentityCatalogItem[] {
  if (!Array.isArray(v)) return [];
  return v.filter((c): c is IdentityCatalogItem => !!c && typeof c === 'object' && typeof (c as IdentityCatalogItem).id === 'string');
}

/** Wire the store's socket events. Call from App.tsx registerGameEvents; returns the cleanup. */
export function registerPlatformCosmeticsEvents(socket: Socket): () => void {
  const onState = (data: {
    ok?: boolean; error?: string; gabuPoints?: number; premium?: boolean;
    owned?: Record<string, unknown>; equipped?: Record<string, unknown>;
    catalog?: { flairs?: unknown; frames?: unknown };
  }) => {
    if (data?.ok) {
      patch({
        status: 'ready',
        balance: typeof data.gabuPoints === 'number' ? data.gabuPoints : 0,
        premium: !!data.premium,
        owned: { flair: idList(data.owned?.flair), frame: idList(data.owned?.frame) },
        equipped: {
          flair: typeof data.equipped?.flair === 'string' ? data.equipped.flair : null,
          frame: typeof data.equipped?.frame === 'string' ? data.equipped.frame : null,
        },
        catalog: { flairs: catalogList(data.catalog?.flairs), frames: catalogList(data.catalog?.frames) },
      });
    } else {
      patch({ status: data?.error === 'guest' ? 'guest' : 'error' });
    }
  };
  const onResult = (data: { ok?: boolean; action?: string; itemId?: string; error?: string }) => {
    if (data?.action !== 'buy' && data?.action !== 'equip') return;
    if (data.ok) {
      // Fresh state (balance/owned/equipped) follows on STATE_EVENT from the server.
      patch({ busyItemId: null, lastError: '' });
    } else {
      patch({ busyItemId: null, lastError: humanError(data.error) });
    }
  };
  socket.on(STATE_EVENT, onState);
  socket.on(RESULT_EVENT, onResult);
  return () => {
    socket.off(STATE_EVENT, onState);
    socket.off(RESULT_EVENT, onResult);
  };
}

function humanError(error?: string): string {
  switch (error) {
    case 'Insufficient GP': return 'Not enough Gabu Points yet — win games or watch an ad on GameBuddies.';
    case 'Cosmetic already owned': return 'You already own that one.';
    case 'Included with Premium': return 'Premium already includes this — just equip it.';
    case 'Cosmetic not owned': return 'Buy this one first (or go Premium — everything is included).';
    case 'Premium required': return 'This one is a Premium exclusive.';
    case 'guest': return 'Sign in with your GameBuddies account to use cosmetics.';
    default: return 'That didn’t go through — please try again in a moment.';
  }
}

/** Ask the server for balance + owned + equipped + catalog (no-op without a socket). */
export function requestPlatformCosmetics(): void {
  const socket = socketService.getSocket();
  if (!socket) return;
  if (state.status === 'idle' || state.status === 'error') patch({ status: 'loading' });
  socket.emit(LIST_EVENT);
}

/** Buy one identity item ('flair' | 'frame'). Result via RESULT_EVENT, then fresh state. */
export function buyPlatformCosmetic(kind: 'flair' | 'frame', itemId: string): void {
  const socket = socketService.getSocket();
  if (!socket) return;
  patch({ busyItemId: itemId, lastError: '' });
  socket.emit(BUY_EVENT, { kind, itemId });
}

/** Equip/unequip an identity item. The room sees it live via gb:player:profile. */
export function equipPlatformCosmetic(kind: 'flair' | 'frame', itemId: string | null): void {
  const socket = socketService.getSocket();
  if (!socket) return;
  patch({ busyItemId: itemId ?? `${kind}:none`, lastError: '' });
  socket.emit(EQUIP_EVENT, { kind, itemId });
}

/** Reset on room leave/disconnect so the next room refetches. */
export function clearPlatformCosmetics(): void {
  if (state === initial) return;
  state = initial;
  emitChange();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PlatformCosmeticsState {
  return state;
}

/** React hook: the live identity-cosmetics state. */
export function usePlatformCosmetics(): PlatformCosmeticsState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
