/**
 * Game Header
 *
 * Header component for in-game view.
 * Shows game branding, room code, player info, and controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, ArrowLeft, Settings, Check, Share2, RotateCcw, MessageSquareWarning } from 'lucide-react';
import type { Lobby, Player } from '../../types';
import { clearSession, type GameBuddiesSession } from '../../services/gameBuddiesSession';
import socketService from '../../services/socketService';
import { useVideoUI } from '../../contexts/VideoUIContext';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { GAME_META } from '../../config/gameMeta';
import { t } from '../../utils/translations';
import MobileGameMenu from './MobileGameMenu';
import SettingsModal from './SettingsModal';
import FeedbackModal from './FeedbackModal';
import SimpleLanguageSelector from './SimpleLanguageSelector';
import GameBuddiesReturnButton from './GameBuddiesReturnButton';
import MuteButton from './MuteButton';
import { VideoControlCluster } from '../video';
import { isDiscordActivity } from '../../services/discordActivity';

interface GameHeaderProps {
  lobby: Lobby;
  gameBuddiesSession?: GameBuddiesSession | null;
  onOpenChat?: () => void;
  onOpenPlayers?: () => void;
  onOpenVideo?: () => void;
  unreadChatCount?: number;
  onReturnToLobby?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  lobby,
  gameBuddiesSession,
  onOpenChat,
  onOpenPlayers,
  onOpenVideo,
  unreadChatCount = 0,
  onReturnToLobby
}) => {
  const hideRoomCode = gameBuddiesSession?.hideRoomCode || lobby.hideRoomCode || lobby.isStreamerMode || false;
  const myPlayer = lobby.players.find((p: Player) => p.socketId === lobby.mySocketId);
  const isHost = myPlayer?.isHost || false;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [, setCopyError] = useState(false);
  const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Helper to copy text with fallback
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers or when clipboard API is unavailable
      console.warn('Clipboard API failed, using fallback:', err);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackErr) {
        console.error('Clipboard fallback also failed:', fallbackErr);
        return false;
      }
    }
  }, []);

  const socket = socketService.getSocket();
  const videoUI = useVideoUI();
  const webrtc = useWebRTC();
  const isMobile = useIsMobile();

  // Listen for invite token response
  useEffect(() => {
    if (!socket) return;

    const onInviteCreated = async (data: { inviteToken: string }) => {
      const baseUrl = window.location.origin;
      const basePath = import.meta.env.BASE_URL || '/';
      const joinUrl = `${baseUrl}${basePath}?invite=${data.inviteToken}`;

      const success = await copyToClipboard(joinUrl);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);

      if (success) {
        setCopyFeedback(true);
        setCopyError(false);
        feedbackTimerRef.current = setTimeout(() => setCopyFeedback(false), 2000);
      } else {
        setCopyError(true);
        feedbackTimerRef.current = setTimeout(() => setCopyError(false), 2000);
      }
    };

    socket.on('room:invite-created', onInviteCreated);

    return () => {
      socket.off('room:invite-created', onInviteCreated);
    };
  }, [socket, copyToClipboard]);

  const copyRoomLink = useCallback(async () => {
    const baseUrl = window.location.origin;
    const basePath = import.meta.env.BASE_URL || '/';

    if (!gameBuddiesSession && !hideRoomCode) {
      const joinUrl = `${baseUrl}${basePath}?invite=${lobby.code}`;
      const success = await copyToClipboard(joinUrl);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);

      if (success) {
        setCopyFeedback(true);
        setCopyError(false);
        feedbackTimerRef.current = setTimeout(() => setCopyFeedback(false), 2000);
      } else {
        setCopyError(true);
        feedbackTimerRef.current = setTimeout(() => setCopyError(false), 2000);
      }
      return;
    }

    if (!socket) return;
    socket.emit('room:create-invite');
  }, [socket, gameBuddiesSession, hideRoomCode, lobby.code, copyToClipboard]);

  const handleLeave = useCallback(() => {
    socketService.clearReconnectionData();
    clearSession();
    sessionStorage.removeItem('gameSessionToken');
    socketService.disconnect();
    window.location.href = import.meta.env.BASE_URL || '/';
  }, []);

  // TODO: Customize phase display for your game
  const getPhaseDisplay = (state: string) => {
    switch (state) {
      case 'lobby':
        return 'Waiting for players';
      case 'playing':
        return 'In Progress';
      case 'finished':
        return 'Game Over';
      default:
        return '';
    }
  };

  const connectedCount = lobby.players.filter((p: Player) => p.connected).length;

  return (
    <header className="game-header">
      <div className="game-header-container">
        {/* Left side - Branding and Room Info */}
        <div className="game-header-left">
          {/* Game Branding */}
          <a href="/" className="game-header-logo">
            <img
              src={`${import.meta.env.BASE_URL}mascot.webp`}
              alt={GAME_META.mascotAlt}
              className="game-header-logo-icon"
            />
            <div className="game-header-logo-text-container">
              <span className="game-header-logo-text">
                {GAME_META.namePrefix}<span className="game-header-accent">{GAME_META.nameAccent}</span>
              </span>
              <span className="game-header-gb-branding">
                <span className="game-header-gb-by">by </span>
                <span className="game-header-gb-game">Game</span>
                <span className="game-header-gb-buddies">Buddies</span>
                <span className="game-header-gb-io">.io</span>
              </span>
            </div>
          </a>

          <div className="game-header-divider desktop-only"></div>

          {/* Room Info - Desktop */}
          <div className="game-header-room-info desktop-only">
            {!hideRoomCode ? (
              <div className="game-header-room-code">
                <span className="game-header-room-label">{t('header.room')}</span>
                <span className="game-header-room-value">{lobby.code}</span>
                <button
                  onClick={copyRoomLink}
                  className="game-header-copy-btn"
                  title={t('header.copyRoomLink')}
                >
                  {copyFeedback ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="game-header-streamer-badge">
                <span>{t('header.streamerMode')}</span>
                <button
                  onClick={copyRoomLink}
                  className="game-header-copy-btn"
                  title={t('header.copyInviteLink')}
                >
                  {copyFeedback ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            <div className="game-header-phase-badge">
              {getPhaseDisplay(lobby.state)}
            </div>
          </div>
        </div>

        {/* Right side - Player info and controls (Desktop only) */}
        {!isMobile && (
          <div className="game-header-right">
            {/* Video Control Cluster — hidden in a Discord Activity (Discord provides
                its own voice/video, so the in-app webcam join is redundant). */}
            {!isDiscordActivity() && (
            <VideoControlCluster
              isVideoEnabled={webrtc.isVideoChatActive}
              isVideoPrepairing={webrtc.isVideoPrepairing}
              onPrepareVideo={webrtc.prepareVideoChat}
              onDisableVideo={webrtc.disableVideoChat}
              isFilmstripExpanded={videoUI.isFilmstripExpanded}
              onToggleFilmstrip={videoUI.toggleFilmstrip}
              isCameraEnabled={webrtc.isCameraEnabled}
              onToggleVideo={webrtc.toggleVideo}
              isAudioEnabled={webrtc.isAudioEnabled}
              onToggleAudio={webrtc.toggleAudio}
              onOpenSettings={videoUI.openSettings}
              onOpenBroadcast={videoUI.requestStreamerBroadcast}
            />
            )}

            <div className="game-header-divider" />

            <SimpleLanguageSelector />

            <MuteButton />

            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="game-header-settings-btn"
              title={t('feedback.title')}
            >
              <MessageSquareWarning className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="game-header-settings-btn"
              title={t('settings.title')}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Return to GameBuddies / Create GB Lobby */}
            {gameBuddiesSession ? (
              <GameBuddiesReturnButton
                roomCode={lobby.code}
                playerId={myPlayer?.socketId}
                isHost={isHost}
                variant="inline"
              />
            ) : isHost ? (
              <GameBuddiesReturnButton
                roomCode={lobby.code}
                isStandalone
                streamerMode={lobby.isStreamerMode}
                variant="inline"
              />
            ) : null}

            {/* Back to Lobby (host only, during game) */}
            {isHost && lobby.state !== 'LOBBY' && (
              <button
                onClick={() => {
                  const socket = socketService.getSocket();
                  // The hearts-gambit server plugin handles `game:backToLobby`
                  // (NOT `game:restart`) — matches VictoryScreen + the mobile menu.
                  if (socket) socket.emit('game:backToLobby', { roomCode: lobby.code });
                }}
                className="game-header-lobby-btn"
              >
                <RotateCcw className="w-4 h-4" />
                {t('game.returnToLobby')}
              </button>
            )}

            <button onClick={handleLeave} className="game-header-leave-btn">
              <ArrowLeft className="w-4 h-4" />
              {t('lobby.leaveRoom')}
            </button>
          </div>
        )}

        {/* Right side - Mobile (Hamburger Menu) */}
        {isMobile && (
          <div className="game-header-right">
            <MuteButton />
            <button onClick={copyRoomLink} className="game-header-copy-btn"
              title={hideRoomCode ? t('header.copyInviteLink') : t('header.copyRoomLink')}>
              {copyFeedback ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
            <MobileGameMenu
              roomCode={lobby.code}
              onCopyLink={copyRoomLink}
              linkCopied={copyFeedback}
              onLeave={handleLeave}
              onChat={onOpenChat}
              unreadCount={unreadChatCount}
              onPlayers={onOpenPlayers}
              playerCount={`${connectedCount}`}
              isVideoEnabled={webrtc.isVideoChatActive}
              onVideo={isDiscordActivity() ? undefined : onOpenVideo}
              onSettings={() => setIsSettingsOpen(true)}
              onReportBug={() => setIsFeedbackOpen(true)}
              hideRoomCode={hideRoomCode}
              isLobby={lobby.state === 'LOBBY'}
              onReturnToLobby={onReturnToLobby}
              onReturnToGameBuddies={lobby.isGameBuddiesRoom ? () => {
                // Seed the portal overlay immediately — App.tsx listens for this event
                // and shows the animation regardless of server response timing.
                window.dispatchEvent(new CustomEvent('gb:portal-begin', {
                  detail: {
                    mode: 'group',
                    roomCode: lobby.code,
                    playerName: myPlayer?.name || sessionStorage.getItem('gamebuddies_playerName') || '',
                  }
                }));
                const socket = socketService.getSocket();
                if (socket) {
                  socket.emit('gamebuddies:return', {
                    roomCode: lobby.code,
                    playerId: myPlayer?.socketId,
                    mode: isHost ? 'group' : 'individual'
                  });
                }
              } : undefined}
            />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      {/* Feedback / Report-a-problem Modal */}
      {isFeedbackOpen && <FeedbackModal lobby={lobby} onClose={() => setIsFeedbackOpen(false)} />}
    </header>
  );
};

export default GameHeader;
