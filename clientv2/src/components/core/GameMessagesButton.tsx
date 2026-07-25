import React from 'react';
import { Mail } from 'lucide-react';
import { t } from '../../utils/translations';
import { useAdminInbox, openInbox } from '../../services/adminInbox';

/**
 * Header entry point for the in-game inbox (conversation with the GameBuddies team).
 *
 * A sibling of the account chip rather than an item inside its dropdown, for three
 * reasons: guests never render the chip at all (GameAccountControl falls back to a
 * bare Log-in button, so a menu item would be invisible to exactly the players who
 * most need this); an unread badge inside a closed dropdown can't be seen; and
 * GameAccountControl is contractually presentational, so it must not subscribe to a
 * store.
 *
 * Always rendered in-game, even with an empty thread — the empty state is the
 * feature that lets a player start a conversation, which was previously impossible
 * without leaving the game.
 */
const GameMessagesButton: React.FC = () => {
  const { unread } = useAdminInbox();
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
