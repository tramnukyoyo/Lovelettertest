/**
 * Mobile Overlay Modal
 *
 * Full-screen overlay modal for mobile containing chat, players, video, etc.
 * Uses createPortal to escape stacking contexts.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Users, Video, Settings } from 'lucide-react';
import type { ChatMessage, Player, Team } from '../../types';
import ChatWindow from '../lobby/ChatWindow';
import PlayerList from '../lobby/PlayerList';
import { MobileVideoGrid } from '../video';
import { isDiscordActivity } from '../../services/discordActivity';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import { t } from '../../utils/translations';

export type DrawerContent = 'chat' | 'players' | 'video' | 'settings' | null;

interface MobileDrawerProps {
  isOpen: boolean;
  content: DrawerContent;
  onClose: () => void;
  // Chat props
  messages?: ChatMessage[];
  roomCode?: string;
  mySocketId?: string;
  // Player props
  players?: Player[];
  isHost?: boolean;
  onKickPlayer?: (playerId: string) => void;
  onMakeHost?: (playerId: string) => void;
  // Video props
  webcamPlayers?: WebcamPlayer[];
  localPlayerName?: string;
  onLeaveVideo?: () => void;
  teams?: Team[];
  className?: string;
  /** Lobby only: show the card-style picker on the viewer's own card. */
  showCardStylePicker?: boolean;
  /** Opens the "Your card back" designer (forwarded to PlayerList). */
  onOpenDesigner?: () => void;
  /** Lobby only (compact): the host settings / guest briefing rendered in a
   *  bottom sheet instead of the primary flow (fleet mobile-lobby format). */
  settingsContent?: React.ReactNode;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  content,
  onClose,
  messages = [],
  roomCode = '',
  mySocketId = '',
  players = [],
  isHost = false,
  onKickPlayer,
  onMakeHost,
  webcamPlayers = [],
  localPlayerName,
  onLeaveVideo,
  teams = [],
  className = '',
  showCardStylePicker = false,
  onOpenDesigner,
  settingsContent
}) => {
  // Lock background scroll while the overlay is open (touch can otherwise
  // scroll the page behind the modal).
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const getTitle = () => {
    switch (content) {
      case 'chat':
        return t('menu.chat');
      case 'players':
        return t('menu.players');
      case 'video':
        return t('menu.videoChat');
      case 'settings':
        return t('menu.settings');
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (content) {
      case 'chat':
        return <MessageCircle className="w-5 h-5" />;
      case 'players':
        return <Users className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'settings':
        return <Settings className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mobile-overlay-backdrop"
            onClick={onClose}
          />

          {/* Full-screen Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`mobile-overlay-modal ${className}`}
          >
            {/* Header */}
            <div className="mobile-overlay-header">
              <div className="mobile-overlay-title">
                {getIcon()}
                <span>{getTitle()}</span>
              </div>
              <button
                onClick={onClose}
                className="mobile-overlay-close"
                aria-label={t('common.close')}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="mobile-overlay-content">
              {content === 'chat' && (
                <ChatWindow
                  messages={messages}
                  roomCode={roomCode}
                  mySocketId={mySocketId}
                  mode="sidebar"
                />
              )}

              {content === 'players' && (
                <PlayerList
                  players={players}
                  mySocketId={mySocketId}
                  isHost={isHost}
                  onKickPlayer={onKickPlayer}
                  onMakeHost={onMakeHost}
                  teams={teams}
                  showCardStylePicker={showCardStylePicker}
                  onOpenDesigner={onOpenDesigner}
                />
              )}

              {content === 'video' && !isDiscordActivity() && (
                <MobileVideoGrid
                  players={webcamPlayers}
                  localPlayerName={localPlayerName}
                  onLeave={() => {
                    if (onLeaveVideo) onLeaveVideo();
                    onClose();
                  }}
                  teams={teams}
                  mySocketId={mySocketId}
                />
              )}

              {content === 'settings' && (
                <div className="mobile-overlay-settings">{settingsContent}</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MobileDrawer;
