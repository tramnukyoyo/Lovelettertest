import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Copy,
  LogOut,
  HelpCircle,
  BookOpen,
  ScrollText,
  Video,
  VideoOff,
  Settings,
  Check,
  Users,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

interface MobileGameMenuProps {
  /** Room code to display */
  roomCode: string;
  /** Callback when user wants to copy invite link */
  onCopyLink: () => void;
  /** Whether link was just copied (for feedback) */
  linkCopied?: boolean;
  /** Callback when user wants to leave */
  onLeave: () => void;
  /** Callback to open How to Play */
  onHowToPlay: () => void;
  /** Callback to open Card Legend */
  onCardLegend: () => void;
  /** Callback to open Rules */
  onRules?: () => void;
  /** Callback to open Chat */
  onChat?: () => void;
  /** Number of unread chat messages */
  unreadCount?: number;
  /** Is video currently enabled */
  isVideoEnabled?: boolean;
  /** Callback to toggle video */
  onToggleVideo?: () => void;
  /** Callback to open settings */
  onSettings?: () => void;
  /** Player count text like "1/4" */
  playerCount?: string;
  /** Callback to return to lobby (host only) */
  onReturnToLobby?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Hamburger menu for mobile game view.
 * Consolidates secondary actions to declutter the header.
 */
const MobileGameMenu: React.FC<MobileGameMenuProps> = ({
  roomCode,
  onCopyLink,
  linkCopied = false,
  onLeave,
  onHowToPlay,
  onCardLegend,
  onRules,
  onChat,
  unreadCount = 0,
  isVideoEnabled = false,
  onToggleVideo,
  onSettings,
  playerCount,
  onReturnToLobby,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Translation helper
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  const handleMenuItemClick = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  const menuItems = [
    {
      id: 'room-code',
      icon: linkCopied ? Check : Copy,
      label: `${t('menu.room')}: ${roomCode}`,
      sublabel: linkCopied ? t('menu.linkCopied') : t('menu.tapToCopyInviteLink'),
      action: onCopyLink,
      highlight: true,
    },
    {
      id: 'players',
      icon: Users,
      label: t('menu.players'),
      sublabel: playerCount || '',
      action: () => {}, // Could open players drawer
      show: !!playerCount,
    },
    {
      id: 'how-to-play',
      icon: HelpCircle,
      label: t('tutorial.howToPlay'),
      action: () => handleMenuItemClick(onHowToPlay),
    },
    {
      id: 'card-legend',
      icon: BookOpen,
      label: t('cardLegend.title'),
      action: () => handleMenuItemClick(onCardLegend),
    },
    {
      id: 'rules',
      icon: ScrollText,
      label: 'Rules',
      action: onRules ? () => handleMenuItemClick(onRules) : undefined,
      show: !!onRules,
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: t('menu.chat'),
      sublabel: unreadCount > 0 ? (unreadCount > 1 ? t('menu.newMessagesPlural').replace('{count}', String(unreadCount)) : t('menu.newMessages').replace('{count}', String(unreadCount))) : t('menu.openChat'),
      action: onChat ? () => handleMenuItemClick(onChat) : undefined,
      show: !!onChat,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'video',
      icon: isVideoEnabled ? Video : VideoOff,
      label: isVideoEnabled ? t('menu.videoOn') : t('menu.videoOff'),
      sublabel: t('menu.tapToToggle'),
      action: onToggleVideo ? () => handleMenuItemClick(onToggleVideo) : undefined,
      show: !!onToggleVideo,
    },
    {
      id: 'settings',
      icon: Settings,
      label: t('menu.settings'),
      action: onSettings ? () => handleMenuItemClick(onSettings) : undefined,
      show: !!onSettings,
    },
    {
      id: 'back-to-lobby',
      icon: ArrowLeft,
      label: t('menu.returnToLobby') || 'Return to Lobby',
      action: onReturnToLobby ? () => handleMenuItemClick(onReturnToLobby) : undefined,
      show: !!onReturnToLobby,
      highlight: true,
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
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          className={`
            hg-hamburger-btn
            flex items-center justify-center
            w-8 h-8 min-w-[32px] min-h-[32px]
            bg-[rgba(var(--accent-color-rgb),0.4)]
            hover:bg-[rgba(var(--accent-color-rgb),0.5)]
            border border-[rgba(var(--accent-color-rgb),0.5)]
            rounded-lg transition-colors
            ${className}
          `}
          aria-label={t('menu.openMenu')}
          aria-expanded={isOpen}
        >
          <Menu className="w-4 h-4 text-[#f6f0e6]" />
        </button>
        {/* Unread chat badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-[var(--royal-crimson)] text-white rounded-full shadow-lg animate-pulse">
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
                className="fixed inset-0 bg-black/80 z-[99999]"
                style={{ backdropFilter: 'none' }}
                onClick={() => setIsOpen(false)}
              />

              {/* Menu panel - compact size */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed top-2 right-2 z-[100000] w-[min(200px,calc(100vw-1rem))] bg-[#1a0f1e] border border-[rgba(212,175,55,0.4)] rounded-xl shadow-2xl overflow-hidden"
              >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(var(--accent-color-rgb),0.2)]">
                <span className="text-xs font-bold text-[var(--royal-gold)] uppercase tracking-wider">
                  {t('menu.title')}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hg-icon-btn w-6 h-6 flex items-center justify-center rounded-md hover:bg-[rgba(var(--accent-color-rgb),0.2)] transition-colors"
                  aria-label={t('menu.closeMenu')}
                >
                  <X className="hg-icon-btn-sm w-3.5 h-3.5 text-[#f6f0e6]" />
                </button>
              </div>

              {/* Menu items - compact */}
              <div className="py-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      disabled={!item.action}
                      className={`
                        w-full flex items-center gap-2 px-3 py-1.5
                        hover:bg-[rgba(var(--accent-color-rgb),0.15)]
                        active:bg-[rgba(var(--accent-color-rgb),0.25)]
                        transition-colors text-left
                        min-h-[32px]
                        ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-[var(--parchment)]'}
                        ${item.highlight ? 'bg-[rgba(var(--accent-color-rgb),0.1)]' : ''}
                        ${!item.action ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className={`
                        w-5 h-5 flex items-center justify-center rounded
                        ${item.danger
                          ? 'bg-red-500/20'
                          : item.highlight
                            ? 'bg-[var(--royal-gold)]/20'
                            : 'bg-[rgba(var(--accent-color-rgb),0.15)]'
                        }
                      `}>
                        <Icon className={`w-3 h-3 ${item.danger ? 'text-red-400' : item.highlight ? 'text-[#d4af37]' : 'text-[#f6f0e6]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">{item.label}</span>
                          {item.badge && (
                            <span className="px-1 py-0 text-[9px] font-bold bg-[var(--royal-crimson)] text-white rounded-full min-w-[14px] text-center">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </div>
                        {item.sublabel && (
                          <div className="text-[10px] text-[var(--parchment-dark)] truncate">
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
