import React from 'react';
import { Mail } from 'lucide-react';
import { t } from '../../utils/translations';
import { useAdminInbox, openInbox } from '../../services/adminInbox';

/**
 * Header entry point for the in-game inbox (conversation with the GameBuddies team).
 *
 * The BADGE lives here, a sibling of the account chip, and not inside its dropdown:
 * an unread count inside a closed menu can't be seen, and guests never render the
 * chip at all (GameAccountControl falls back to a bare Log-in button), so a menu
 * item alone would be invisible to exactly the players who most need this.
 * The dropdown does carry a plain "Messages" item — that's the cold-start entry
 * point, deliberately unbadged, and it reaches this store via an onOpenMessages
 * prop so GameAccountControl stays contractually presentational.
 *
 * Rendered ONLY when there is something to surface: an unread message, one
 * received recently, or a live arrival / manual open this session (see
 * `visible`/`revealed` in services/adminInbox). Not "has ever been messaged" —
 * that leaves the icon on forever for anyone who once got a reply, which is the
 * permanent-header-furniture problem this exists to avoid.
 *
 * Starting a conversation from cold now lives in the account menu (desktop) and the
 * hamburger (mobile), both of which call openInbox() — which reveals this button, so
 * the thread stays one click away for the rest of the session.
 */
const GameMessagesButton: React.FC = () => {
  const { unread, visible } = useAdminInbox();
  if (!visible) return null;

  const label = unread > 0
    ? t('adminMessage.unreadTitle', { count: unread })
    : t('adminMessage.buttonLabel');

  return (
    <span className="game-header-messages">
      <button
        type="button"
        className={`game-header-settings-btn game-header-messages-btn ${unread > 0 ? 'has-unread' : ''}`}
        onClick={openInbox}
        title={label}
        aria-label={label}
      >
        <Mail className="w-4 h-4" />
      </button>
      {unread > 0 && (
        <span className="game-header-messages-badge" aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </span>
  );
};

export default GameMessagesButton;
