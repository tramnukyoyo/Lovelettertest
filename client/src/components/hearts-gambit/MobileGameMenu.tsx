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
  Video,
  VideoOff,
  Settings,
  Check,
  Users
} from 'lucide-react';

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
  /** Is video currently enabled */
  isVideoEnabled?: boolean;
  /** Callback to toggle video */
  onToggleVideo?: () => void;
  /** Callback to open settings */
  onSettings?: () => void;
  /** Player count text like "1/4" */
  playerCount?: string;
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
  isVideoEnabled = false,
  onToggleVideo,
  onSettings,
  playerCount,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuItemClick = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  const menuItems = [
    {
      id: 'room-code',
      icon: linkCopied ? Check : Copy,
      label: `Room: ${roomCode}`,
      sublabel: linkCopied ? 'Link copied!' : 'Tap to copy invite link',
      action: onCopyLink,
      highlight: true,
    },
    {
      id: 'players',
      icon: Users,
      label: 'Players',
      sublabel: playerCount || '',
      action: () => {}, // Could open players drawer
      show: !!playerCount,
    },
    {
      id: 'how-to-play',
      icon: HelpCircle,
      label: 'How to Play',
      action: () => handleMenuItemClick(onHowToPlay),
    },
    {
      id: 'card-legend',
      icon: BookOpen,
      label: 'Card Legend',
      action: () => handleMenuItemClick(onCardLegend),
    },
    {
      id: 'video',
      icon: isVideoEnabled ? Video : VideoOff,
      label: isVideoEnabled ? 'Video On' : 'Video Off',
      sublabel: 'Tap to toggle',
      action: onToggleVideo ? () => handleMenuItemClick(onToggleVideo) : undefined,
      show: !!onToggleVideo,
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      action: onSettings ? () => handleMenuItemClick(onSettings) : undefined,
      show: !!onSettings,
    },
    {
      id: 'leave',
      icon: LogOut,
      label: 'Leave Room',
      action: () => handleMenuItemClick(onLeave),
      danger: true,
    },
  ].filter(item => item.show !== false);

  return (
    <>
      {/* Hamburger trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          hg-hamburger-btn
          flex items-center justify-center
          w-11 h-11 min-w-[44px] min-h-[44px]
          bg-[rgba(var(--accent-color-rgb),0.4)]
          hover:bg-[rgba(var(--accent-color-rgb),0.5)]
          border border-[rgba(var(--accent-color-rgb),0.5)]
          rounded-xl transition-colors
          ${className}
        `}
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Menu className="w-5 h-5 text-[#f6f0e6]" />
      </button>

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

              {/* Menu panel */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed top-2 right-2 z-[100000] w-[min(280px,calc(100vw-1rem))] bg-[#1a0f1e] border border-[rgba(212,175,55,0.4)] rounded-2xl shadow-2xl overflow-hidden"
              >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(var(--accent-color-rgb),0.2)]">
                <span className="text-sm font-bold text-[var(--royal-gold)] uppercase tracking-wider">
                  Menu
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hg-icon-btn w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgba(var(--accent-color-rgb),0.2)] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="hg-icon-btn-sm w-4 h-4 text-[#f6f0e6]" />
                </button>
              </div>

              {/* Menu items */}
              <div className="py-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      disabled={!item.action}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3
                        hover:bg-[rgba(var(--accent-color-rgb),0.15)]
                        active:bg-[rgba(var(--accent-color-rgb),0.25)]
                        transition-colors text-left
                        min-h-[48px]
                        ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-[var(--parchment)]'}
                        ${item.highlight ? 'bg-[rgba(var(--accent-color-rgb),0.1)]' : ''}
                        ${!item.action ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className={`
                        w-8 h-8 flex items-center justify-center rounded-lg
                        ${item.danger
                          ? 'bg-red-500/20'
                          : item.highlight
                            ? 'bg-[var(--royal-gold)]/20'
                            : 'bg-[rgba(var(--accent-color-rgb),0.15)]'
                        }
                      `}>
                        <Icon className={`w-4 h-4 ${item.danger ? 'text-red-400' : item.highlight ? 'text-[#d4af37]' : 'text-[#f6f0e6]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        {item.sublabel && (
                          <div className="text-xs text-[var(--parchment-dark)] truncate">
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
