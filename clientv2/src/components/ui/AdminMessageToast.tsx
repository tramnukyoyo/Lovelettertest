import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, X } from 'lucide-react';
import { t } from '../../utils/translations';
import { useAdminInbox, openInbox, dismissToast } from '../../services/adminInbox';
import { getToastLane } from './toastRail';
import './AdminMessageToast.css';

/**
 * Quiet notice that a GameBuddies admin has messaged this player. Clicking it opens
 * the full conversation in MessagesPanel.
 *
 * Deliberately has NO composer and NEVER touches keyboard focus. The previous
 * version autofocused a reply box 50ms after appearing, which stole input from
 * players mid-round in every real-time game; it also only ever held one message
 * (a second arrival overwrote the first) and allowed exactly one reply. The
 * conversation itself now lives in the panel, so this is only an attention hook.
 *
 * Delivery: the game server emits `admin:message` to this player's socket; the
 * adminInbox store owns the state and this renders whatever it puts in `toast`.
 *
 * Skin + placement come from the shared .ps-toast family (toastRail.css). It used
 * to pin itself to `top:20px; right:20px`, which sat straight on top of the XP
 * toast; both now queue in the rail's right lane.
 */

/** Long enough to notice mid-round, short enough not to camp on the HUD. */
const AUTO_DISMISS_MS = 8000;

/** t() returns the key itself on a miss, so `t(k) || fallback` NEVER fires. */
function tr(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

const AdminMessageToast: React.FC = () => {
  const { toast } = useAdminInbox();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return createPortal(
    <div className="ps-toast ps-toast--info gb-admsg" role="status" aria-live="polite">
      <span className="ps-toast__icon">
        <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      {/* Spans, not <p>: a button's content model is phrasing content only.
          Slots follow the family order eyebrow (category) → title (who) → text
          (payload); the sender used to occupy the eyebrow, leaving this the only
          rail member with no title tier. */}
      <button className="ps-toast__action" type="button" onClick={openInbox}>
        <span className="ps-toast__eyebrow">{tr('toast.category.message', 'Message')}</span>
        <span className="ps-toast__title">{toast.fromName || 'GameBuddies'}</span>
        <span className="ps-toast__text">{toast.body}</span>
        <span className="ps-toast__cta">{t('adminMessage.newMessageHint')}</span>
      </button>
      <button
        className="ps-toast__close"
        onClick={dismissToast}
        type="button"
        aria-label={t('adminMessage.close')}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>,
    getToastLane('top-right')
  );
};

export default AdminMessageToast;
