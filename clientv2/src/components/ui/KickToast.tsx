/**
 * Kick Toast Component
 *
 * Displays a styled toast notification when a player is kicked from the room.
 * Renders into the shared #ps-toast-rail so it can never land on top of the XP,
 * achievement, admin-message or site-notification toasts.
 *
 * The old `.kick-toast` class names were dropped on purpose: a second, LOUDER
 * copy of them lives in prime-suspect-unified.css (a red gradient pill at
 * z-index 10002) which loads after the component CSS and won the cascade, so
 * the local skin was never what shipped.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserMinus, X } from 'lucide-react';
import { t } from '../../utils/translations';
import { getToastLane } from './toastRail';

/** t() returns the key itself on a miss, so `t(k) || fallback` NEVER fires. */
function tr(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

interface KickToastProps {
  message: string | null;
  onClose: () => void;
}

const KickToast: React.FC<KickToastProps> = ({ message, onClose }) => {
  const [exiting, setExiting] = useState(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) {
      setExiting(false);
      return;
    }
    setExiting(false);

    let animationTimer: ReturnType<typeof setTimeout> | null = null;

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setExiting(true);
      animationTimer = setTimeout(onClose, 300); // Wait for the exit animation
    }, 5000);

    return () => {
      clearTimeout(timer);
      if (animationTimer) clearTimeout(animationTimer);
    };
  }, [message, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!message) return null;

  const handleClose = () => {
    setExiting(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(onClose, 300);
  };

  return createPortal(
    <div
      className={`ps-toast ps-toast--danger${exiting ? ' is-exiting' : ''}`}
      data-ps-toast="kick"
      role="alert"
    >
      <span className="ps-toast__icon">
        <UserMinus size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      {/* Slot order across the whole family is eyebrow (category) → title
          (headline) → text (payload). The headline used to sit in the eyebrow,
          which is 0.66rem uppercase typewriter — so the one message that ends a
          player's session read as small print next to an achievement unlock. */}
      <div className="ps-toast__body">
        <span className="ps-toast__eyebrow">{tr('toast.category.removed', 'Removed')}</span>
        <span className="ps-toast__title">{t('kickToast.title')}</span>
        <span className="ps-toast__text">{message}</span>
      </div>
      <button
        className="ps-toast__close"
        onClick={handleClose}
        type="button"
        aria-label={t('kickToast.close')}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>,
    getToastLane('top-center')
  );
};

export default KickToast;
