import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { t } from '../../utils/translations';
import { getToastLane } from './toastRail';

export interface SiteNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target: string;
}

interface SiteNotificationToastProps {
  notification: SiteNotification | null;
  onClose: () => void;
}

const ICON_MAP = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

/**
 * Every in-room server rejection routes through this component (App.tsx), so it
 * is the most-seen system message in the game. It used to paint itself with a
 * leftover prairie palette (#4cc66a / #e0763c / #e05252) in inline styles — a
 * flat neon block in a candlelit case file. Tone now maps onto the shared
 * .ps-toast family accents.
 */
const TONE_CLASS: Record<SiteNotification['type'], string> = {
  info: 'ps-toast--info',
  success: 'ps-toast--reward',
  warning: 'ps-toast--danger',
  error: 'ps-toast--danger',
};

/** t() returns the key itself on a miss, so `t(k) || fallback` NEVER fires. */
function tr(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

/** Eyebrow = the CATEGORY only; the server's own headline owns the title tier
 *  (see KickToast for the same slot order). Sending `notification.title` to the
 *  eyebrow left the most-seen system message in the game with no title tier at
 *  all — a 0.66rem uppercase line where an achievement gets Cinzel. */
const TONE_EYEBROW: Record<SiteNotification['type'], [string, string]> = {
  info: ['toast.category.notice', 'Notice'],
  success: ['toast.category.confirmed', 'Confirmed'],
  warning: ['toast.category.warning', 'Warning'],
  error: ['toast.category.error', 'Error'],
};

const SiteNotificationToast: React.FC<SiteNotificationToastProps> = ({ notification, onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!notification) {
      setExiting(false);
      return;
    }
    setExiting(false);
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const Icon = ICON_MAP[notification.type] || Info;
  const [eyebrowKey, eyebrowFallback] = TONE_EYEBROW[notification.type] || TONE_EYEBROW.info;

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 300);
  };

  return createPortal(
    <div
      className={`ps-toast ${TONE_CLASS[notification.type] || 'ps-toast--info'}${exiting ? ' is-exiting' : ''}`}
      data-ps-toast="site"
      role={notification.type === 'error' || notification.type === 'warning' ? 'alert' : 'status'}
      aria-live={notification.type === 'error' || notification.type === 'warning' ? 'assertive' : 'polite'}
    >
      <span className="ps-toast__icon">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="ps-toast__body">
        <span className="ps-toast__eyebrow">{tr(eyebrowKey, eyebrowFallback)}</span>
        <span className="ps-toast__title">{notification.title}</span>
        <span className="ps-toast__text">{notification.message}</span>
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

export default SiteNotificationToast;
