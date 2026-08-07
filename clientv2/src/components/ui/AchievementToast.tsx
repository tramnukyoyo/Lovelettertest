/**
 * AchievementToast — fleet-standard rich unlock toast (2026-08-05).
 *
 * Renders `gb:achievement:unlocked` broadcasts (any player in the room) as a
 * compact rarity-tinted card: icon (iconUrl with trophy fallback), name,
 * description, unlocking player. Global listener pattern mirrors the
 * platform's AchievementUnlockToast: mount <AchievementToastHost /> once in
 * App, call showAchievementToast(unlock) from the socket handler.
 *
 * Prime Suspect skin: this used to carry its own inline visual language
 * (borderRadius 10, `5px 5px 0 #000` pixel bevel) AND its own hard-pinned
 * `top:16; left:50%; zIndex:10001` stack, which sat on top of the kick and
 * site-notification toasts. Placement now comes from #ps-toast-rail and the
 * skin from the shared .ps-toast family; only the rarity accent stays local,
 * injected as the family's --ps-toast-accent custom property.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X } from 'lucide-react';
import type { PostgameUnlock } from '../../services/postgame';
import { t } from '../../utils/translations';
import { getToastLane } from './toastRail';

/** t() returns the key itself on a miss, so `t(k) || fallback` never fires. */
function tr(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

export const ACHIEVEMENT_RARITY_COLORS: Record<string, string> = {
  common: '#d9cfbe',
  uncommon: '#c9b98a',
  rare: '#d2b25a',
  epic: '#e7cc7a',
  legendary: '#f2dd9a',
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
      setToasts((prev) => [...prev, { ...u, toastId, visible: true }].slice(-MAX_VISIBLE));
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
    <>
      {toasts.map((toast) => {
        const rarity = (toast.achievement.rarity || 'common').toLowerCase();
        const accent = ACHIEVEMENT_RARITY_COLORS[rarity] || ACHIEVEMENT_RARITY_COLORS.common;
        return (
          <div
            key={toast.toastId}
            className={`ps-toast ps-toast--reward${toast.visible ? '' : ' is-exiting'}`}
            data-ps-toast="achievement"
            data-rarity={rarity}
            role="status"
            style={{ '--ps-toast-accent': accent } as React.CSSProperties}
          >
            <span className="ps-toast__icon">
              {toast.achievement.iconUrl ? (
                <img src={toast.achievement.iconUrl} alt="" />
              ) : (
                <Trophy size={20} strokeWidth={1.75} aria-hidden="true" />
              )}
            </span>
            <div className="ps-toast__body">
              <span className="ps-toast__eyebrow">
                {rarity} · {tr('achievementToast.unlocked', 'Achievement unlocked')}
              </span>
              <span className="ps-toast__title">{toast.achievement.name}</span>
              <span className="ps-toast__text">
                {toast.playerName}
                {toast.achievement.description ? ` — ${toast.achievement.description}` : ''}
              </span>
            </div>
            <button
              type="button"
              className="ps-toast__close"
              onClick={() => closeToast(toast.toastId)}
              aria-label={t('kickToast.close')}
            >
              {/* 16, like every other .ps-toast__close in the 28px control. */}
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </>,
    getToastLane('top-center')
  );
};

export default AchievementToastHost;
