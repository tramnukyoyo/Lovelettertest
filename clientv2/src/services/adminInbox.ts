/**
 * In-game inbox store — the player's conversation with the GameBuddies team.
 *
 * Mirrors gamebuddies.io's MessageThreadModal, but reads and writes over the game
 * socket instead of HTTP: games also run as Discord Activities and on their own
 * domains, where a browser fetch to the platform is blocked, and guests have no
 * token to send. The game server derives the player's userId from their room seat,
 * so this file never has to know who the player is.
 *
 * Kept OUTSIDE lobby state (like playerProfiles/cosmeticsShop) so room-state
 * broadcasts can't wipe it, and so the header badge and the panel share one source
 * of truth. Game-agnostic — ports to other clients unchanged.
 */

import { useSyncExternalStore } from 'react';
import type { Socket } from 'socket.io-client';
import socketService from './socketService';

const PUSH_EVENT = 'admin:message';
const UNREAD_EVENT = 'gb:messages:unread';
const GET_EVENT = 'gb:messages:get';
const SEND_EVENT = 'gb:messages:send';
const READ_EVENT = 'gb:messages:read';

/** Server max. Support threads never approach it, so the panel needs no paging. */
const HISTORY_LIMIT = 200;

export interface InboxMessage {
  id: string;
  sender_role: 'admin' | 'user';
  body: string;
  created_at: string;
}

export interface AdminInboxState {
  /** 'error' means the fetch failed — NOT that the conversation is empty. */
  status: 'idle' | 'loading' | 'ready' | 'error';
  threadId: string | null;
  messages: InboxMessage[];
  unread: number;
  open: boolean;
  sending: boolean;
  /** Optimistic bubbles the server rejected; rendered with a retry affordance. */
  failedIds: string[];
  /** Transient "new message" notice. Never focuses anything — see AdminMessageToast. */
  toast: { body: string; fromName: string; at: number } | null;
}

const initial: AdminInboxState = {
  status: 'idle', threadId: null, messages: [], unread: 0,
  open: false, sending: false, failedIds: [], toast: null,
};

let state: AdminInboxState = initial;
const listeners = new Set<() => void>();
let localSeq = 0;

function emitChange() {
  listeners.forEach((l) => l());
}

function patch(p: Partial<AdminInboxState>) {
  state = { ...state, ...p };
  emitChange();
}

/**
 * Adopt a server list without losing bubbles it hasn't seen.
 *
 * `local-` bubbles are sends still in flight (or failed and awaiting retry); the
 * server genuinely doesn't know about them yet, so they survive. `push-` bubbles
 * came from the toast and ARE in the server's list, so they're dropped to avoid
 * showing the same message twice.
 */
function mergeServerMessages(serverMessages: InboxMessage[]): InboxMessage[] {
  const pending = state.messages.filter((m) => m.id.startsWith('local-'));
  return pending.length > 0 ? [...serverMessages, ...pending] : serverMessages;
}

/** Wire the inbox socket events. Call from App.tsx registerGameEvents; returns the cleanup. */
export function registerAdminInboxEvents(socket: Socket): () => void {
  const onPush = (data: { threadId?: string | null; body?: string; fromName?: string; at?: number }) => {
    if (!data?.body) return;
    const at = typeof data.at === 'number' ? data.at : Date.now();

    // Show it immediately rather than waiting on the refetch — if the platform is
    // unreachable this local copy is the only thing standing between the player and
    // a message they were just notified about.
    patch({
      threadId: data.threadId ?? state.threadId,
      messages: [...state.messages, {
        id: `push-${at}`,
        sender_role: 'admin',
        body: data.body,
        created_at: new Date(at).toISOString(),
      }],
      unread: state.open ? 0 : state.unread + 1,
      toast: state.open ? null : { body: data.body, fromName: data.fromName || 'GameBuddies', at },
    });

    // Authoritative history (with real row ids) replaces the local copy.
    requestInbox();
    if (state.open) markInboxRead();
  };

  const onUnread = (data: { count?: number }) => {
    // Seeded once from profile hydration, so a message that arrived while the
    // player was away still lights the badge. Never lowers a live count.
    const count = typeof data?.count === 'number' ? data.count : 0;
    if (count > state.unread && !state.open) patch({ unread: count });
  };

  socket.on(PUSH_EVENT, onPush);
  socket.on(UNREAD_EVENT, onUnread);
  return () => {
    socket.off(PUSH_EVENT, onPush);
    socket.off(UNREAD_EVENT, onUnread);
  };
}

/** Fetch the conversation. Safe to call repeatedly; the panel calls it on open. */
export function requestInbox(): void {
  const socket = socketService.getSocket();
  if (!socket) return;
  if (state.status === 'idle' || state.status === 'error') patch({ status: 'loading' });

  socket.emit(GET_EVENT, { limit: HISTORY_LIMIT }, (res: {
    ok?: boolean; threadId?: string | null; messages?: InboxMessage[]; unread?: number;
  }) => {
    if (!res?.ok) {
      // Keep whatever we already have on screen — an outage must not look like an
      // empty conversation, or the player retypes a message they already sent.
      patch({ status: 'error' });
      return;
    }
    patch({
      status: 'ready',
      threadId: res.threadId ?? null,
      messages: mergeServerMessages(res.messages ?? []),
      unread: state.open ? 0 : (res.unread ?? 0),
    });
  });
}

/** Clear the unread flag server-side (also clears the platform bell badge). */
export function markInboxRead(): void {
  socketService.getSocket()?.emit(READ_EVENT, {}, () => { /* best-effort */ });
}

export function openInbox(): void {
  patch({ open: true, unread: 0, toast: null });
  requestInbox();
  markInboxRead();
}

export function closeInbox(): void {
  if (!state.open) return;
  patch({ open: false });
}

export function dismissToast(): void {
  if (state.toast) patch({ toast: null });
}

/**
 * Send a message. The bubble appears immediately and is swapped for the persisted
 * row when the server acks — which is what makes "sent" honest. The old toast
 * claimed "Reply sent ✓" unconditionally and never listened for the ack at all.
 */
export function sendInboxMessage(body: string): void {
  const socket = socketService.getSocket();
  const text = body.trim();
  if (!socket || !text) return;

  const localId = `local-${++localSeq}`;
  patch({
    sending: true,
    messages: [...state.messages, {
      id: localId,
      sender_role: 'user',
      body: text,
      created_at: new Date().toISOString(),
    }],
  });

  socket.emit(SEND_EVENT, { threadId: state.threadId, body: text }, (res: {
    ok?: boolean; threadId?: string | null; message?: InboxMessage | null;
  }) => {
    if (!res?.ok) {
      patch({ sending: false, failedIds: [...state.failedIds, localId] });
      return;
    }
    patch({
      sending: false,
      threadId: res.threadId ?? state.threadId,
      messages: res.message
        ? state.messages.map((m) => (m.id === localId ? res.message as InboxMessage : m))
        : state.messages,
    });
    if (!res.message) requestInbox();
  });
}

/** Re-send a bubble the server rejected, dropping the failed copy. */
export function retryInboxMessage(localId: string): void {
  const target = state.messages.find((m) => m.id === localId);
  if (!target) return;
  patch({
    messages: state.messages.filter((m) => m.id !== localId),
    failedIds: state.failedIds.filter((id) => id !== localId),
  });
  sendInboxMessage(target.body);
}

/** Reset on room leave/disconnect so the next room refetches. */
export function clearAdminInbox(): void {
  if (state === initial) return;
  state = initial;
  emitChange();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AdminInboxState {
  return state;
}

/** React hook: the live inbox state (messages / unread / open / busy). */
export function useAdminInbox(): AdminInboxState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
