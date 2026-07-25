import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, X } from 'lucide-react';
import { t } from '../../utils/translations';
import { useAdminInbox, openInbox, dismissToast } from '../../services/adminInbox';
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
 * Styling is class-based and themed from the host game's unified.css tokens.
 */

/** Long enough to notice mid-round, short enough not to camp on the HUD. */
const AUTO_DISMISS_MS = 8000;

const AdminMessageToast: React.FC = () => {
  const { toast } = useAdminInbox();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return createPortal(
    <div className="gb-admsg" role="status" aria-live="polite">
      <div className="gb-admsg-header">
        <Mail className="gb-admsg-icon" size={18} />
        <strong className="gb-admsg-from">{toast.fromName || 'GameBuddies'}</strong>
        <button
          className="gb-admsg-close"
          onClick={dismissToast}
          type="button"
          aria-label={t('adminMessage.close')}
        >
          <X size={16} />
        </button>
      </div>
      {/* Spans, not <p>: a button's content model is phrasing content only. */}
      <button className="gb-admsg-body" type="button" onClick={openInbox}>
        <span className="gb-admsg-text">{toast.body}</span>
        <span className="gb-admsg-cta">{t('adminMessage.newMessageHint')}</span>
      </button>
    </div>,
    document.body
  );
};

export default AdminMessageToast;
