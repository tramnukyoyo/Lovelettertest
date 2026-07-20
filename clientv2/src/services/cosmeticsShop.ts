/**
 * In-game GP cosmetics-shop store (HYBRID model).
 *
 * Owned items + GabuPoints balance arrive from the game server via
 * `primesuspect:cosmetics:state` (requested with `primesuspect:cosmetics:list`;
 * buys go through `primesuspect:cosmetics:buy` → `:result`). Kept
 * OUTSIDE lobby state (like playerProfiles) so room-state broadcasts can't wipe
 * it, and so the style designer and the player-list picker share one source of
 * truth for "owned".
 *
 * The store itself is game-agnostic — event names are injected once via
 * registerCosmeticsShopEvents() — so this file ports to other games unchanged
 * apart from the four event-name constants.
 */

import { useSyncExternalStore } from 'react';
import type { Socket } from 'socket.io-client';
import socketService from './socketService';

const LIST_EVENT = 'primesuspect:cosmetics:list';
const STATE_EVENT = 'primesuspect:cosmetics:state';
const BUY_EVENT = 'primesuspect:cosmetics:buy';
const RESULT_EVENT = 'primesuspect:cosmetics:result';

export interface CosmeticsShopState {
  status: 'idle' | 'loading' | 'ready' | 'guest' | 'error';
  /** GabuPoints balance (only meaningful when status === 'ready'). */
  balance: number;
  /** Player holds an active Premium tier (items are included for them). */
  premium: boolean;
  /** Flat owned platform item ids across all of this game's kinds. */
  owned: string[];
  /** Item currently being purchased (disables its button), or null. */
  buyingItemId: string | null;
  /** Last buy failure, surfaced inline in the shop ('' = none). */
  lastError: string;
}

const initial: CosmeticsShopState = {
  status: 'idle', balance: 0, premium: false, owned: [], buyingItemId: null, lastError: '',
};

let state: CosmeticsShopState = initial;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

function patch(p: Partial<CosmeticsShopState>) {
  state = { ...state, ...p };
  emitChange();
}

function flattenOwned(owned: unknown): string[] {
  if (!owned || typeof owned !== 'object') return [];
  const out: string[] = [];
  for (const ids of Object.values(owned as Record<string, unknown>)) {
    if (Array.isArray(ids)) out.push(...ids.filter((x): x is string => typeof x === 'string'));
  }
  return out;
}

/** Wire the shop's socket events. Call from App.tsx registerGameEvents; returns the cleanup. */
export function registerCosmeticsShopEvents(socket: Socket): () => void {
  const onState = (data: { ok?: boolean; error?: string; gabuPoints?: number; premium?: boolean; owned?: unknown }) => {
    if (data?.ok) {
      patch({
        status: 'ready',
        balance: typeof data.gabuPoints === 'number' ? data.gabuPoints : 0,
        premium: !!data.premium,
        owned: flattenOwned(data.owned),
      });
    } else {
      patch({ status: data?.error === 'guest' ? 'guest' : 'error' });
    }
  };
  const onResult = (data: { ok?: boolean; action?: string; itemId?: string; error?: string }) => {
    if (data?.action !== 'buy') return;
    if (data.ok) {
      // Fresh state (balance + owned) follows on STATE_EVENT from the server.
      patch({ buyingItemId: null, lastError: '' });
    } else {
      patch({ buyingItemId: null, lastError: humanBuyError(data.error) });
    }
  };
  socket.on(STATE_EVENT, onState);
  socket.on(RESULT_EVENT, onResult);
  return () => {
    socket.off(STATE_EVENT, onState);
    socket.off(RESULT_EVENT, onResult);
  };
}

function humanBuyError(error?: string): string {
  switch (error) {
    case 'Insufficient GP': return 'Not enough Gabu Points yet — win games or watch an ad on GameBuddies.';
    case 'Cosmetic already owned': return 'You already own that one.';
    case 'guest': return 'Sign in with your GameBuddies account to buy cosmetics.';
    default: return 'Purchase failed — please try again in a moment.';
  }
}

/** Ask the server for balance + owned items (no-op without a socket). */
export function requestCosmeticsState(): void {
  const socket = socketService.getSocket();
  if (!socket) return;
  if (state.status === 'idle' || state.status === 'error') patch({ status: 'loading' });
  socket.emit(LIST_EVENT);
}

/** Buy one item. Result arrives via RESULT_EVENT (then fresh state via STATE_EVENT). */
export function buyCosmetic(kind: string, itemId: string): void {
  const socket = socketService.getSocket();
  if (!socket) return;
  patch({ buyingItemId: itemId, lastError: '' });
  socket.emit(BUY_EVENT, { kind, itemId });
}

/** Reset on room leave/disconnect so the next room refetches. */
export function clearCosmeticsShop(): void {
  if (state === initial) return;
  state = initial;
  emitChange();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CosmeticsShopState {
  return state;
}

/** React hook: the live shop state (balance / premium / owned / busy). */
export function useCosmeticsShop(): CosmeticsShopState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
