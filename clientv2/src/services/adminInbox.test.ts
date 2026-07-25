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

  it('reveals on a recent-but-already-read thread, without inventing a badge', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 0, recent: true });
    expect(mod.getAdminInboxState().visible).toBe(true);
    expect(mod.getAdminInboxState().unread).toBe(0);
  });

  it('stays hidden when the seed says neither unread nor recent', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 0, recent: false });
    expect(mod.getAdminInboxState().visible).toBe(false);
  });

  it('stays hidden when an older gameserver omits `recent` and nothing is unread', async () => {
    const { mod, handlers } = await freshInbox();
    unread(handlers, { count: 0 });
    expect(mod.getAdminInboxState().visible).toBe(false);
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
