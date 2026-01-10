import React, { useState, useEffect } from 'react';
import { Copy, Users, Crown, ArrowLeft, Settings } from 'lucide-react';
import type { Lobby, Player } from '../types';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import { SettingsModal } from './SettingsModalNoir';
import socketService from '../services/socketService';

import VideoControlCluster from './VideoControlCluster';
import { useVideoUI } from '../contexts/VideoUIContext';
import { GAME_META } from '../config/gameMeta';
import SimpleLanguageSelector from './SimpleLanguageSelector';
import { getTranslation, getCurrentLanguage } from '../utils/translations';

interface GameHeaderProps {
  lobby: Lobby;
  gameBuddiesSession?: GameBuddiesSession | null;
}

const GameHeader: React.FC<GameHeaderProps> = ({ lobby, gameBuddiesSession }) => {
  const hideRoomCode = gameBuddiesSession?.hideRoomCode || lobby.hideRoomCode || lobby.isStreamerMode || false;
  const myPlayer = lobby.players.find((p: Player) => p.socketId === lobby.mySocketId);
  const isHost = myPlayer?.isHost || false;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const socket = socketService.getSocket();

  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  // Video UI context for filmstrip/popup/settings control
  const videoUI = useVideoUI();

  // Listen for invite token response
  useEffect(() => {
    if (!socket) return;

    const onInviteCreated = (data: { inviteToken: string }) => {
      const baseUrl = window.location.origin;
      const basePath = import.meta.env.BASE_URL || '/';
      const joinUrl = `${baseUrl}${basePath}?invite=${data.inviteToken}`;

      navigator.clipboard.writeText(joinUrl).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        console.log('Invite link copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy invite link.');
      });
    };

    socket.on('room:invite-created', onInviteCreated);

    return () => {
      socket.off('room:invite-created', onInviteCreated);
    };
  }, [socket]);

  const copyRoomLink = async () => {
    const baseUrl = window.location.origin;
    const basePath = import.meta.env.BASE_URL || '/';

    // If we're not in a GameBuddies session and room code isn't hidden, use room code directly.
    // This yields URLs like: /heartsgambit/?invite=ROOMCODE
    if (!gameBuddiesSession && !hideRoomCode) {
      const joinUrl = `${baseUrl}${basePath}?invite=${lobby.code}`;
      try {
        await navigator.clipboard.writeText(joinUrl);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
        alert('Failed to copy room link.');
      }
      return;
    }

    if (!socket) {
      console.error('Socket not connected, cannot create invite link');
      return;
    }

    // Default: secure invite token flow (GameBuddies / streamer mode).
    socket.emit('room:create-invite');
    // The socket listener in useEffect will handle the copy
  };

  const getPhaseDisplay = (state: string) => {
    switch (state) {
      case 'LOBBY_WAITING':
        return t('gameHeader.waitingForPlayers');
      case 'ROUND_PREP':
        return t('gameHeader.getReady');
      case 'WORD_INPUT':
        return t('gameHeader.thinkOfWord');
      case 'REVEAL':
        return t('gameHeader.revealing');
      case 'VICTORY':
        return t('game.victory');
      case 'GAME_OVER':
        return t('game.gameOver');
      default:
        return '';
    }
  };

  const handleLeave = () => {
    // Clear reconnection data before leaving to prevent auto-rejoin
    socketService.clearReconnectionData();
    sessionStorage.removeItem('gameSessionToken');
    window.location.href = window.location.pathname;
  };

  return (
    <header className="game-header">
      <div className="game-header-container">
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

          {/* Divider */}
          <div className="game-header-divider"></div>

          {/* Room Info */}
          <div className="game-header-room-info">
            {!hideRoomCode ? (
              <div className="game-header-room-code">
                <span className="game-header-room-label">{t('gameHeader.room')}:</span>
                <span className="game-header-room-value">{lobby.code}</span>
                <div className="game-header-copy-wrapper">
                  <button
                    onClick={copyRoomLink}
                    className="game-header-copy-btn"
                    title={t('gameHeader.copyRoomLink')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {copyFeedback && (
                    <span className="game-header-copy-feedback">{t('gameHeader.copied')}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="game-header-streamer-badge">
                <span>{t('gameHeader.streamerMode')}</span>
                <div className="game-header-copy-wrapper">
                  <button
                    onClick={copyRoomLink}
                    className="game-header-copy-btn streamer"
                    title={t('gameHeader.copyInviteLink')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {copyFeedback && (
                    <span className="game-header-copy-feedback">{t('gameHeader.copied')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Phase Badge */}
            <div className="game-header-phase-badge">
              {getPhaseDisplay(lobby.state)}
            </div>
          </div>
        </div>

        {/* Right side - Player info and Video Controls */}
        <div className="game-header-right">
          {/* Video Control Cluster */}
          <VideoControlCluster
            onOpenSettings={videoUI.openSettings}
            onOpenPopout={videoUI.requestPopup}
            onToggleFilmstrip={videoUI.toggleFilmstrip}
            isFilmstripExpanded={videoUI.isFilmstripExpanded}
          />

          {/* Divider between video controls and other controls */}
          <div className="game-header-divider"></div>

          {/* Player count */}
          <div className="game-header-player-count">
            <Users className="w-4 h-4" />
            <span>{lobby.players.filter((p: Player) => p.connected).length}/2</span>
          </div>

          {/* Current player info */}
          <div className={`game-header-player-info ${isHost ? 'host' : ''}`}>
            {isHost && <Crown className="w-4 h-4" />}
            <span>{myPlayer?.name || t('common.player')}</span>
            {isHost && <span className="game-header-host-badge">{t('playerList.host')}</span>}
          </div>

          {/* Language Selector */}
          <SimpleLanguageSelector />
          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="game-header-settings-btn"
            title={t('header.settings')}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Leave button */}
          <button onClick={handleLeave} className="game-header-leave-btn">
            <ArrowLeft className="w-4 h-4" />
            {t('gameHeader.leave')}
          </button>
        </div>
      </div>

      {/* Mobile: Room info row */}
      <div className="game-header-mobile-row">
        {!hideRoomCode ? (
          <div className="game-header-room-code mobile">
            <span className="game-header-room-label">{t('gameHeader.room')}:</span>
            <span className="game-header-room-value">{lobby.code}</span>
            <div className="game-header-copy-wrapper">
              <button
                onClick={copyRoomLink}
                className="game-header-copy-btn"
                title={t('gameHeader.copyRoomLink')}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {copyFeedback && (
                <span className="game-header-copy-feedback">{t('gameHeader.copied')}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="game-header-streamer-badge mobile">{t('gameHeader.streamer')}</span>
        )}
        <div className="game-header-phase-badge mobile">
          {getPhaseDisplay(lobby.state)}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </header>
  );
};

export default GameHeader;
