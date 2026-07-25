import { describe, it, expect, vi } from 'vitest';

/**
 * Covers `visible` — whether the game header shows a mail icon at all.
 *
 * The rule: the icon is not permanent furniture. It appears when there is actually
 * a conversation (unread, a live push, a thread the server flagged recent, or the
 * player opening it from the account menu), and once revealed it must NOT retract
 * for the rest of the tab — including across the clearAdminInbox() that every room
 * leave and socket teardown fires.
 */

/** Records handlers so a test can drive the server→client events by hand. */
function makeSocket() {
  const handlers = new Map<string, (payload: unknown) => void>();
  const socket = {
    on: vi.fn((ev: string, fn: (payload: unknown) => void) => { handlers.set(ev, fn); }),
    off: vi.fn((ev: string) => { handlers.delete(ev); }),
    // Chained as socket.timeout(ms).emit(...); no ack is ever invoked, which leaves
    // fetches pending — irrelevant to visibility.
    timeout: vi.fn(() => socket),
    emit: vi.fn(),
  };
  return { socket, handlers };
}

/**
 * A fresh copy of the module per test. `revealed` is module-level by design (it must
 * outlive clearAdminInbox), so tests would otherwise leak into each other.
 */
async function freshInbox() {
  vi.resetModules();
  const { socket, handlers } = makeSocket();
  vi.doMock('./socketService', () => ({ default: { getSocket: () => socket } }));
  const mod = await import('./adminInbox');
  mod.registerAdminInboxEvents(socket as never);
  return { mod, socket, handlers };
}

const unread = (h: Map<string, (p: unknown) => void>, payload: unknown) =>
  h.get('gb:messages:unread')!(payload);
const push = (h: Map<string, (p: unknown) => void>, payload: unknown) =>
  h.get('admin:message')!(payload);

describe('adminInbox visibility', () => {
  it('starts hidden — the common case is a player who has never been messaged', async () => {
    const { mod } = await freshInbox();
    expect(mod.getAdminInboxState().visible).toBe(false);
    expect(mod.getAdminInboxState().unread).toBe(0);
  });

  it('reveals on an unread seed', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 2, recent: false });
    expect(mod.getAdminInboxState().visible).toBe(true);
    expect(mod.getAdminInboxState().unread).toBe(2);
  });

  // Read, but the conversation is still live — the reply path must stay open.
  it('reveals on a read-but-recent thread, without inventing a badge', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 0, recent: true });
    expect(mod.getAdminInboxState().visible).toBe(true);
    expect(mod.getAdminInboxState().unread).toBe(0);
  });

  // The regression that forced this rule back from "has a thread at all": a
  // player who was messaged hours ago and read it must NOT carry the icon
  // forever. Guests reuse their stored gb_guestUserId, so "a fresh test player"
  // is usually the same platform user as yesterday — under a thread-existence
  // rule every one of them showed the icon on join.
  it('stays hidden for an old, already-read conversation', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 0, recent: false });
    expect(mod.getAdminInboxState().visible).toBe(false);
  });

  it('stays hidden when an older gameserver omits `recent` and nothing is unread', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 0 });
    expect(mod.getAdminInboxState().visible).toBe(false);
  });

  // Unread wins regardless of age: a message sent while the player was offline
  // gets no popup, so the badge is the only way they can ever discover it.
  it('reveals an old but still-unread message', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 1, recent: false });
    expect(mod.getAdminInboxState().visible).toBe(true);
    expect(mod.getAdminInboxState().unread).toBe(1);
  });

  it('re-seeding on reconnect keeps the icon after a reload', async () => {
    const { mod, handlers } = await freshInbox();
    // Fresh tab: nothing revealed yet, exactly as after an F5.
    expect(mod.getAdminInboxState().visible).toBe(false);
    unread(handlers, { count: 0, recent: true });
    expect(mod.getAdminInboxState().visible).toBe(true);
  });

  it('reveals on a live admin message', async () => {
    const { mod, handlers } = await freshInbox();
    push(handlers, { threadId: 't1', body: 'hello', at: Date.now() });
    expect(mod.getAdminInboxState().visible).toBe(true);
    expect(mod.getAdminInboxState().unread).toBe(1);
  });

  it('reveals when opened from the account menu with no history', async () => {
    const { mod } = await freshInbox();
    mod.openInbox();
    expect(mod.getAdminInboxState().visible).toBe(true);
  });

  it('reveals when the player sends the first message', async () => {
    const { mod } = await freshInbox();
    mod.sendInboxMessage('hi there');
    expect(mod.getAdminInboxState().visible).toBe(true);
  });

  it('survives clearAdminInbox — a room hop must not retract a live entry point', async () => {
    const { mod, handlers } = await freshInbox();
    push(handlers, { threadId: 't1', body: 'hello', at: Date.now() });
    expect(mod.getAdminInboxState().visible).toBe(true);

    mod.clearAdminInbox();

    const after = mod.getAdminInboxState();
    expect(after.visible).toBe(true);    // sticky for the tab
    expect(after.unread).toBe(0);        // but the thread itself is reset
    expect(after.messages).toEqual([]);
    expect(after.threadId).toBeNull();
  });

  it('leaves a never-revealed inbox hidden after clearAdminInbox', async () => {
    const { mod } = await freshInbox();
    mod.clearAdminInbox();
    expect(mod.getAdminInboxState().visible).toBe(false);
  });
});
