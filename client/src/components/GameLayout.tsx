import React, { useState, useCallback } from 'react';
import { Video, VideoOff } from 'lucide-react';
import { getTranslation, getCurrentLanguage } from '../utils/translations';
import WebcamDisplay from './WebcamDisplay';
import PlayerList from './PlayerList';
import ChatWindow from './ChatWindow';
import SpectatorBanner from './core/SpectatorBanner';
import type { Lobby } from '../types';
import type { Socket } from 'socket.io-client';

interface GameLayoutProps {
  children: React.ReactNode;
  lobby: Lobby;
  socket: Socket;
}

const GameLayout: React.FC<GameLayoutProps> = ({ children, lobby, socket }) => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);
  const [isWebcamHidden, setIsWebcamHidden] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Spectator: view as player
  const myPlayer = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isSpectator = myPlayer?.isSpectator || false;
  const viewingAs = (lobby as any).viewingAs
    ? lobby.players.find(p => p.socketId === (lobby as any).viewingAs)
    : null;
  const handleSpectatorPlayerClick = useCallback((targetSocketId: string) => {
    if (!isSpectator) return;
    socket.emit('spectator:view-as', { targetSocketId });
  }, [isSpectator, socket]);
  const handleResetView = useCallback(() => {
    socket.emit('spectator:view-as', { targetSocketId: null });
  }, [socket]);

  return (
    <div className="app-layout">
      {/* Webcam Top Bar - Always available */}
      {!isWebcamHidden && (
        <div className="webcam-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Video size={18} style={{ color: 'var(--secondary)' }} />
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
              {t('video.videoChat')}
            </h3>
          </div>
          <WebcamDisplay lobby={lobby} />
        </div>
      )}

      {/* Webcam Toggle Button - Bottom center */}
      <button
        onClick={() => setIsWebcamHidden(!isWebcamHidden)}
        className="webcam-toggle-btn"
        title={isWebcamHidden ? t('video.showWebcam') : t('video.hideWebcam')}
      >
        {isWebcamHidden ? (
          <>
            <VideoOff size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
            {t('video.showVideoLabel')}
          </>
        ) : (
          <>
            <Video size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
            {t('video.hideVideoLabel')}
          </>
        )}
      </button>

      {/* Spectator Banner */}
      {isSpectator && (
        <SpectatorBanner
          viewingAs={viewingAs ? { name: viewingAs.name } : null}
          onResetView={handleResetView}
        />
      )}

      {/* Main Container */}
      <div className="main-container">
        {/* Game Content */}
        <div className="game-content">
          {children}
        </div>

        {/* Right Sidebar - PlayerList + Chat */}
        <div className="right-sidebar">
          {/* Player List */}
          <div className="player-list">
            <PlayerList
              players={lobby.players}
              hostId={lobby.hostId}
              mySocketId={lobby.mySocketId}
              roomCode={lobby.code}
              socket={socket}
              isSpectator={isSpectator}
              viewingAsSocketId={(lobby as any).viewingAs}
              onPlayerClick={handleSpectatorPlayerClick}
            />
          </div>

          {/* Chat */}
          <div className="sidebar-chat">
            <ChatWindow
              lobby={lobby}
              socket={socket}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              mode="sidebar"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLayout;
