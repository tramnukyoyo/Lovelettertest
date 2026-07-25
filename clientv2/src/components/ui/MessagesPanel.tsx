import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Send, X } from 'lucide-react';
import { t } from '../../utils/translations';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  useAdminInbox,
  closeInbox,
  requestInbox,
  sendInboxMessage,
  retryInboxMessage,
} from '../../services/adminInbox';
import './MessagesPanel.css';

/**
 * The in-game inbox: the player's whole conversation with the GameBuddies team,
 * with a composer they can use as many times as they like.
 *
 * Replaces the old one-shot toast, which showed a single message, accepted exactly
 * one reply and then locked itself. Deliberately non-modal and draggable on desktop
 * — the game keeps running underneath and the player can move the window off
 * whatever they need to see. On mobile it becomes a full-screen sheet, where
 * dragging makes no sense.
 *
 * Styling is class-based and themed from the host game's unified.css tokens, so it
 * matches whichever game it's dropped into. See MessagesPanel.css.
 */

const POS_KEY = 'gb_msgPanelPos';

type Pos = { x: number; y: number };

function readPos(): Pos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pos>;
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const MessagesPanel: React.FC = () => {
  const { open, status, messages, threadId, sending, failedIds } = useAdminInbox();
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState('');
  const [pos, setPos] = useState<Pos | null>(readPos);

  const panelRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const wasOpen = useRef(false);

  // On open: pull the panel back into view (a position saved at 1920px is
  // off-screen at 1280) and focus the composer. Focusing is safe ONLY because
  // opening is always an explicit user gesture — the toast never focuses anything.
  useEffect(() => {
    if (!open) { wasOpen.current = false; return; }
    if (wasOpen.current) return;
    wasOpen.current = true;

    const el = panelRef.current;
    if (el && pos) {
      setPos({
        x: clamp(pos.x, 0, Math.max(0, window.innerWidth - el.offsetWidth)),
        y: clamp(pos.y, 0, Math.max(0, window.innerHeight - el.offsetHeight)),
      });
    }
    if (document.visibilityState === 'visible') taRef.current?.focus();
  }, [open, pos]);

  useEffect(() => {
    if (open) listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isMobile]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = panelRef.current;
    if (!drag || !el) return;
    setPos({
      x: clamp(e.clientX - drag.dx, 0, Math.max(0, window.innerWidth - el.offsetWidth)),
      y: clamp(e.clientY - drag.dy, 0, Math.max(0, window.innerHeight - el.offsetHeight)),
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    try {
      if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch { /* storage unavailable */ }
  }, [pos]);

  if (!open) return null;

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    sendInboxMessage(text);
    setDraft('');
  };

  // Positioned from state only once dragged; otherwise CSS owns the default corner.
  const style = !isMobile && pos ? { left: pos.x, top: pos.y, right: 'auto' as const } : undefined;

  return createPortal(
    <div
      ref={panelRef}
      className="gb-msg"
      style={style}
      role="dialog"
      aria-label={t('adminMessage.dialogLabel')}
      // Panel-scoped rather than a window listener: games in this fleet bind Escape
      // and other bare keys globally, and a window listener would fight them.
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeInbox(); } }}
    >
      <div
        className="gb-msg-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title={isMobile ? undefined : t('adminMessage.dragHint')}
      >
        <Mail className="gb-msg-icon" size={18} />
        <strong className="gb-msg-title">{t('adminMessage.title')}</strong>
        <button className="gb-msg-close" onClick={closeInbox} type="button" aria-label={t('adminMessage.close')}>
          <X size={16} />
        </button>
      </div>

      <div className="gb-msg-list">
        {status === 'loading' && messages.length === 0 ? (
          <div className="gb-msg-empty">{t('adminMessage.loading')}</div>
        ) : status === 'error' && messages.length === 0 ? (
          // Never render a failed fetch as "no messages yet" — the player would
          // reasonably conclude their history was lost and write it all again.
          <div className="gb-msg-empty">
            {t('adminMessage.unavailable')}
            <button type="button" className="gb-msg-retry" onClick={requestInbox}>
              {t('adminMessage.retry')}
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="gb-msg-empty">{t('adminMessage.empty')}</div>
        ) : (
          messages.map((m) => {
            const failed = failedIds.includes(m.id);
            return (
              <div
                key={m.id}
                className={`gb-msg-bubble is-${m.sender_role}${failed ? ' is-failed' : ''}`}
                onClick={failed ? () => retryInboxMessage(m.id) : undefined}
              >
                <div className="gb-msg-sender">
                  {m.sender_role === 'admin' ? t('adminMessage.fromTeam') : t('adminMessage.you')}
                </div>
                <div className="gb-msg-body">{m.body}</div>
                <div className="gb-msg-time">
                  {failed ? t('adminMessage.sendFailed') : new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      <div className="gb-msg-composer">
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder={threadId ? t('adminMessage.replyPlaceholder') : t('adminMessage.firstMessagePlaceholder')}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          className="gb-msg-send"
          onClick={send}
          type="button"
          disabled={sending || !draft.trim()}
          aria-label={t('adminMessage.send')}
        >
          <Send size={16} />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default MessagesPanel;
