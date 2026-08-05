/**
 * AchievementToast — fleet-standard rich unlock toast (2026-08-05).
 *
 * Renders `gb:achievement:unlocked` broadcasts (any player in the room) as a
 * compact rarity-tinted card: icon (iconUrl with trophy fallback), name,
 * description, unlocking player. Global listener pattern mirrors the
 * platform's AchievementUnlockToast: mount <AchievementToastHost /> once in
 * App, call showAchievementToast(unlock) from the socket handler.
 *
 * Fleet copy rules: this file is self-contained (inline styles, no CSS
 * import) so per-client copies stay one file. Adapt ONLY the SKIN block to
 * the client's visual language; keep structure and behavior identical.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X } from 'lucide-react';
import type { PostgameUnlock } from '../../services/postgame';

// ---- SKIN (per-client visual language; Prime Suspect = royal noir velvet) --
const SKIN = {
  background: 'rgba(44, 32, 41, 0.97)',
  borderRadius: 10,
  boxShadow: '5px 5px 0 rgba(0, 0, 0, 0.55)',
  fontFamily: "'Libre Franklin', system-ui, -apple-system, sans-serif",
};
// ---------------------------------------------------------------------------

export const ACHIEVEMENT_RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#4cc66a',
  rare: '#38bdf8',
  epic: '#a78bfa',
  legendary: '#fbbf24',
};

const DURATION_MS = 6000;
const MAX_VISIBLE = 2;

type ToastItem = PostgameUnlock & { toastId: number; visible: boolean };

let idCounter = 0;
const listeners = new Set<(u: PostgameUnlock) => void>();

/** Show a rich achievement toast (no-op until the host is mounted). */
export function showAchievementToast(unlock: PostgameUnlock): void {
  listeners.forEach((l) => l(unlock));
}

const AchievementToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const dismiss = (toastId: number) => {
      setToasts((prev) => prev.map((t) => (t.toastId === toastId ? { ...t, visible: false } : t)));
      timers.current.push(window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
      }, 300));
    };
    const onUnlock = (u: PostgameUnlock) => {
      const toastId = ++idCounter;
      setToasts((prev) => [...prev, { ...u, toastId, visible: false }].slice(-MAX_VISIBLE));
      // Next tick so the entrance transition actually plays.
      timers.current.push(window.setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.toastId === toastId ? { ...t, visible: true } : t)));
      }, 30));
      timers.current.push(window.setTimeout(() => dismiss(toastId), DURATION_MS));
    };
    listeners.add(onUnlock);
    const pending = timers.current;
    return () => {
      listeners.delete(onUnlock);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const closeToast = (toastId: number) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'center',
        pointerEvents: 'none',
        maxWidth: 'min(420px, 92vw)',
      }}
    >
      {toasts.map((toast) => {
        const rarity = (toast.achievement.rarity || 'common').toLowerCase();
        const accent = ACHIEVEMENT_RARITY_COLORS[rarity] || ACHIEVEMENT_RARITY_COLORS.common;
        return (
          <div
            key={toast.toastId}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              width: '100%',
              background: SKIN.background,
              color: '#ffffff',
              border: `1px solid ${accent}66`,
              borderLeft: `4px solid ${accent}`,
              borderRadius: SKIN.borderRadius,
              boxShadow: `${SKIN.boxShadow}, 0 0 18px ${accent}33`,
              fontFamily: SKIN.fontFamily,
              opacity: toast.visible ? 1 : 0,
              transform: toast.visible ? 'translateY(0)' : 'translateY(-24px)',
              transition: 'transform 0.3s ease, opacity 0.3s ease',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${accent}22`,
                border: `1px solid ${accent}55`,
                borderRadius: SKIN.borderRadius,
              }}
            >
              {toast.achievement.iconUrl ? (
                <img
                  src={toast.achievement.iconUrl}
                  alt=""
                  style={{ width: 36, height: 36, objectFit: 'contain' }}
                />
              ) : (
                <Trophy size={24} color={accent} strokeWidth={2.5} aria-hidden="true" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: accent,
                  textTransform: 'uppercase',
                }}
              >
                {rarity} · Achievement unlocked
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
                {toast.achievement.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.82,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {toast.playerName}
                {toast.achievement.description ? ` — ${toast.achievement.description}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => closeToast(toast.toastId)}
              aria-label="Close notification"
              style={{
                background: 'rgba(255,255,255,0.14)',
                border: 'none',
                color: '#ffffff',
                padding: 4,
                borderRadius: SKIN.borderRadius,
                cursor: 'pointer',
                display: 'flex',
                flexShrink: 0,
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default AchievementToastHost;
