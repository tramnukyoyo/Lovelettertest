/**
 * Mobile Game Menu (Hamburger Menu)
 *
 * Consolidated menu for mobile game view.
 * Uses createPortal to escape stacking contexts.
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Copy,
  LogOut,
  HelpCircle,
  Video,
  VideoOff,
  Settings,
  Check,
  Users,
  MessageCircle,
  Volume2,
  ExternalLink,
  Home,
  MessageSquareWarning,
  LogIn,
  Crown,
  User,
  Mail
} from 'lucide-react';
import { t } from '../../utils/translations';
import { hapticFeedback } from '../../utils/hapticFeedback';

interface MobileGameMenuProps {
  /** Room code to display */
  roomCode: string;
  /** Callback when user wants to copy invite link */
  onCopyLink: () => void;
  /** Whether link was just copied (for feedback) */
  linkCopied?: boolean;
  /** Callback when user wants to leave */
  onLeave: () => void;
  /** Callback to open Chat */
  onChat?: () => void;
  /** Number of unread chat messages */
  unreadCount?: number;
  /** Callback to open Players drawer */
  onPlayers?: () => void;
  /** Player count text like "3/8" */
  playerCount?: string;
  /** Is video currently enabled */
  isVideoEnabled?: boolean;
  /** Callback to toggle video */
  onVideo?: () => void;
  /** Callback to open sound settings */
  onSoundSettings?: () => void;
  /** Callback to open settings */
  onSettings?: () => void;
  /** Callback to open the feedback / report-a-problem modal */
  onReportBug?: () => void;
  /** Callback to open How to Play */
  onHowToPlay?: () => void;
  /** Hide room code (streamer mode) */
  hideRoomCode?: boolean;
  /** Current game phase */
  gamePhase?: string;
  /** Is in lobby (not in game) */
  isLobby?: boolean;
  /** Callback to return to lobby from game */
  onReturnToLobby?: () => void;
  /** Callback to return to GameBuddies (only if launched from GB) */
  onReturnToGameBuddies?: () => void;
  /** Callback to open the in-game inbox (conversation with the GameBuddies team).
   *  The permanent way in on mobile — the header's mail icon only exists while a
   *  conversation is live. Unlike the desktop account dropdown this is offered to
   *  guests too, since the hamburger renders for them. */
  onMessages?: () => void;
  /** Callback to log in / sign up (guests only; leaves to the platform login) */
  onLogin?: () => void;
  /** Callback to log out (logged-in only; leaves to the platform logout) */
  onLogout?: () => void;
  /** Current player name (shown in the account row when logged in) */
  playerName?: string;
  /** Whether the player has premium (shows a crown in the account row) */
  isPremium?: boolean;
  /** Whether the player is logged in (shows the account row + Log out) */
  isLoggedIn?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Hamburger menu for mobile game view.
 */
const MobileGameMenu: React.FC<MobileGameMenuProps> = ({
  roomCode,
  onCopyLink,
  linkCopied = false,
  onLeave,
  onChat,
  unreadCount = 0,
  onPlayers,
  playerCount,
  isVideoEnabled = false,
  onVideo,
  onSoundSettings,
  onSettings,
  onReportBug,
  onHowToPlay,
  hideRoomCode = false,
  isLobby = false,
  onReturnToLobby,
  onReturnToGameBuddies,
  onMessages,
  onLogin,
  onLogout,
  playerName,
  isPremium = false,
  isLoggedIn = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuItemClick = useCallback((action: () => void) => {
    hapticFeedback.tap();
    action();
    setIsOpen(false);
  }, []);

  const menuItems = [
    {
      id: 'account',
      icon: isPremium ? Crown : User,
      label: playerName || 'Player',
      sublabel: isPremium ? t('menu.premiumMember') : t('menu.loggedIn'),
      action: undefined, // informational row
      show: isLoggedIn && !!playerName,
      highlight: true,
    },
    {
      id: 'room-code',
      icon: linkCopied ? Check : Copy,
      label: hideRoomCode ? t('menu.streamerMode') : `Room: ${roomCode}`,
      sublabel: linkCopied ? t('menu.linkCopied') : t('menu.tapToCopy'),
      action: onCopyLink,
      highlight: true,
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: t('menu.chat'),
      sublabel: unreadCount > 0 ? t('menu.newMessages', { count: unreadCount }) : t('menu.openChat'),
      action: onChat ? () => handleMenuItemClick(onChat) : undefined,
      show: !!onChat,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'players',
      icon: Users,
      label: t('menu.players'),
      sublabel: playerCount || '',
      action: onPlayers ? () => handleMenuItemClick(onPlayers) : undefined,
      show: !!onPlayers,
    },
    {
      id: 'video',
      icon: isVideoEnabled ? Video : VideoOff,
      label: isVideoEnabled ? t('menu.videoOn') : t('menu.videoOff'),
      sublabel: t('menu.tapToToggle'),
      action: onVideo ? () => handleMenuItemClick(onVideo) : undefined,
      show: !!onVideo,
    },
    {
      id: 'sound',
      icon: Volume2,
      label: t('menu.soundSettings'),
      action: onSoundSettings ? () => handleMenuItemClick(onSoundSettings) : undefined,
      show: !!onSoundSettings,
    },
    {
      id: 'how-to-play',
      icon: HelpCircle,
      label: t('menu.howToPlay'),
      action: onHowToPlay ? () => handleMenuItemClick(onHowToPlay) : undefined,
      show: !!onHowToPlay,
    },
    {
      id: 'settings',
      icon: Settings,
      label: t('menu.settings'),
      action: onSettings ? () => handleMenuItemClick(onSettings) : undefined,
      show: !!onSettings,
    },
    {
      // Beside report-bug: both are "talk to the GameBuddies team". Deliberately
      // not badged — the header's mail icon owns the unread count, and this menu's
      // badge already means room chat.
      id: 'messages',
      icon: Mail,
      label: t('adminMessage.buttonLabel'),
      action: onMessages ? () => handleMenuItemClick(onMessages) : undefined,
      show: !!onMessages,
    },
    {
      id: 'report-bug',
      icon: MessageSquareWarning,
      label: t('feedback.menuLabel'),
      action: onReportBug ? () => handleMenuItemClick(onReportBug) : undefined,
      show: !!onReportBug,
    },
    {
      id: 'return-to-lobby',
      icon: Home,
      label: t('menu.returnToLobby'),
      sublabel: t('menu.resetForAll'),
      action: onReturnToLobby ? () => handleMenuItemClick(onReturnToLobby) : undefined,
      show: !isLobby && !!onReturnToLobby,
      highlight: true,
    },
    {
      id: 'gamebuddies',
      icon: ExternalLink,
      label: t('menu.returnToGameBuddies'),
      sublabel: t('menu.backToLobby'),
      action: onReturnToGameBuddies ? () => handleMenuItemClick(onReturnToGameBuddies) : undefined,
      show: !!onReturnToGameBuddies,
      highlight: true,
    },
    {
      id: 'login',
      icon: LogIn,
      label: t('menu.login'),
      sublabel: t('menu.loginSublabel'),
      action: onLogin ? () => handleMenuItemClick(onLogin) : undefined,
      show: !!onLogin,
      highlight: true,
    },
    {
      id: 'logout',
      icon: LogOut,
      label: t('menu.logout'),
      action: onLogout ? () => handleMenuItemClick(onLogout) : undefined,
      show: !!onLogout,
    },
    {
      id: 'leave',
      icon: LogOut,
      label: t('menu.leaveRoom'),
      action: () => handleMenuItemClick(onLeave),
      danger: true,
    },
  ].filter(item => item.show !== false);

  return (
    <>
      {/* Hamburger trigger button */}
      <div className="mobile-game-menu-trigger">
        <button
          onClick={() => {
            hapticFeedback.tap();
            setIsOpen(true);
          }}
          className={`mobile-game-menu-btn ${className}`}
          aria-label={t('menus.openMenu')}
          aria-expanded={isOpen}
        >
          <Menu className="w-4 h-4" />
        </button>
        {/* Unread chat badge */}
        {unreadCount > 0 && (
          <span className="mobile-game-menu-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Menu overlay - rendered via portal to escape stacking contexts */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mobile-game-menu-backdrop"
                onClick={() => setIsOpen(false)}
              />

              {/* Menu panel */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="mobile-game-menu-panel"
              >
                {/* Header */}
                <div className="mobile-game-menu-header">
                  <span className="mobile-game-menu-title">{t('menus.menuTitle')}</span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="mobile-game-menu-close"
                    aria-label={t('menus.closeMenu')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Menu items */}
                <div className="mobile-game-menu-items">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        disabled={!item.action}
                        className={`mobile-game-menu-item ${item.danger ? 'danger' : ''} ${item.highlight ? 'highlight' : ''}`}
                      >
                        <div className={`mobile-game-menu-item-icon ${item.danger ? 'danger' : ''} ${item.highlight ? 'highlight' : ''}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="mobile-game-menu-item-content">
                          <div className="mobile-game-menu-item-label">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="mobile-game-menu-item-badge">
                                {item.badge > 9 ? '9+' : item.badge}
                              </span>
                            )}
                          </div>
                          {item.sublabel && (
                            <div className="mobile-game-menu-item-sublabel">
                              {item.sublabel}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default MobileGameMenu;
