/**
 * Video Filmstrip
 *
 * Horizontal strip of video feeds at the bottom of the screen.
 * Collapsible to save screen space.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWebRTC } from './adapters';
import { useVideoUI } from './adapters';
import WebcamDisplay from './WebcamDisplay';
import type { WebcamPlayer } from './adapters';
import type { Team } from './adapters';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

// Filmstrip resize constants
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 300;
const DEFAULT_HEIGHT = 110;
const COLLAPSED_SAFE_SPACE = 40;

// Calculate video dimensions based on filmstrip height
// Reserve ~20px for padding, maintain 4:3 aspect ratio
const getVideoDimensions = (filmstripHeight: number) => {
  const videoHeight = Math.max(60, filmstripHeight - 20);
  const videoWidth = Math.floor(videoHeight * (4 / 3));
  return { width: videoWidth, height: videoHeight };
};

interface VideoFilmstripProps {
  players: WebcamPlayer[];
  roomCode?: string;
  localPlayerName?: string;
  currentTurnPlayerId?: string | null;
  className?: string;
  teams?: Team[];
  mySocketId?: string;
}

const VideoFilmstrip: React.FC<VideoFilmstripProps> = ({
  players,
  roomCode = '',
  localPlayerName,
  currentTurnPlayerId,
  className = '',
  teams = [],
  mySocketId
}) => {
  const { localStream, remoteStreams, speakingPeers, isVideoEnabled, isVideoPrepairing } = useWebRTC();
  const { isFilmstripExpanded, toggleFilmstrip, isStreamerBroadcastOpen } = useVideoUI();
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as keyof typeof import('../../utils/translations').translations.en, language);

  // Helper to get player's team color
  const getPlayerTeamColor = (playerId: string): string | undefined => {
    for (const team of teams) {
      if (team.playerIds.includes(playerId)) {
        return team.color;
      }
    }
    return undefined;
  };

  // Helper to sort players by team (Team Red first, then Team Blue, etc.)
  const sortPlayersByTeam = <T extends { id: string }>(playerList: T[]): T[] => {
    if (teams.length === 0) return playerList;
    return [...playerList].sort((a, b) => {
      const teamA = teams.findIndex(t => t.playerIds.includes(a.id));
      const teamB = teams.findIndex(t => t.playerIds.includes(b.id));
      // Players without team go last
      if (teamA === -1 && teamB === -1) return 0;
      if (teamA === -1) return 1;
      if (teamB === -1) return -1;
      return teamA - teamB;
    });
  };

  // Debug logging (only in development)
  if (import.meta.env.DEV) {
    console.log('[VideoFilmstrip] Render - isVideoEnabled:', isVideoEnabled, 'isVideoPrepairing:', isVideoPrepairing, 'localStream:', !!localStream, 'players:', players.length);
  }

  // Filmstrip resize state
  const [filmstripHeight, setFilmstripHeight] = useState(() => {
    const saved = localStorage.getItem('filmstrip-height');
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
  });
  const [isResizing, setIsResizing] = useState(false);
  const filmstripHeightRef = useRef(filmstripHeight);

  // Get stream for a player
  const getStreamForPlayer = (playerId: string): MediaStream | null => {
    return remoteStreams.get(playerId) || null;
  };

  // Handle filmstrip resize
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = filmstripHeightRef.current;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;
      const delta = startY - currentY; // Dragging up increases height
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta));
      setFilmstripHeight(newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);
      localStorage.setItem('filmstrip-height', filmstripHeightRef.current.toString());
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, []);

  // Keep filmstrip height ref in sync
  useEffect(() => {
    filmstripHeightRef.current = filmstripHeight;
  }, [filmstripHeight]);

  // Toggle resizing class on root for CSS transitions
  useEffect(() => {
    const root = document.querySelector('.app-root');
    if (isResizing) {
      root?.classList.add('filmstrip-resizing');
    } else {
      root?.classList.remove('filmstrip-resizing');
    }
    return () => {
      root?.classList.remove('filmstrip-resizing');
    };
  }, [isResizing]);

  // Set CSS variable for filmstrip safe space (so content doesn't clip under filmstrip)
  useEffect(() => {
    const safeSpace = isFilmstripExpanded
      ? filmstripHeight
      : (isStreamerBroadcastOpen ? 0 : COLLAPSED_SAFE_SPACE);

    const showFilmstrip = isVideoEnabled && !isStreamerBroadcastOpen;
    document.documentElement.classList.toggle('has-filmstrip', showFilmstrip);
    document.documentElement.style.setProperty(
      '--filmstrip-safe-space',
      showFilmstrip ? `${safeSpace}px` : '0px'
    );

    return () => {
      document.documentElement.classList.remove('has-filmstrip');
      document.documentElement.style.setProperty('--filmstrip-safe-space', '0px');
    };
  }, [isFilmstripExpanded, filmstripHeight, isVideoEnabled, isStreamerBroadcastOpen]);

  // Hide filmstrip until video is active or preparing
  if (!isVideoEnabled && !isVideoPrepairing) {
    if (import.meta.env.DEV) {
      console.log('[VideoFilmstrip] Returning null - isVideoEnabled:', isVideoEnabled, 'isVideoPrepairing:', isVideoPrepairing);
    }
    return null;
  }

  if (isStreamerBroadcastOpen) {
    return null;
  }

  if (!isFilmstripExpanded) {
    return (
      <div
        className={`video-filmstrip collapsed ${className}`}
        onClick={toggleFilmstrip}
        title={t('videoFilmstrip.clickToShow')}
      >
        <div className="filmstrip-resize-handle" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: filmstripHeight, opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: isResizing ? 0 : 0.3 }}
        className={`video-filmstrip ${isResizing ? 'resizing' : ''} ${className}`}
        style={{ height: `${filmstripHeight}px` }}
      >
        {/* Resize handle - drag to resize, double-click to collapse */}
        <div
          className="filmstrip-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          onDoubleClick={toggleFilmstrip}
          title={t('videoFilmstrip.dragToResize')}
        />

        {/* Video feeds */}
        <div className="video-filmstrip-feeds">
          {players.length === 0 && !localStream ? (
            <div className="video-filmstrip-empty">
              <p>{t('videoFilmstrip.noVideoFeeds')}</p>
            </div>
          ) : (
            <>
              {/* Local stream first */}
              {localStream && (() => {
                const dims = getVideoDimensions(filmstripHeight);
                const localTeamColor = mySocketId ? getPlayerTeamColor(mySocketId) : undefined;
                const localIsSpeaking = !!mySocketId && speakingPeers.has(mySocketId);
                return (
                  <WebcamDisplay
                    player={{ id: 'local', name: localPlayerName || t('videoFilmstrip.you') }}
                    stream={localStream}
                    isLocal
                  isSpeaking={localIsSpeaking}
                    size="small"
                    style={{ width: `${dims.width}px`, height: `${dims.height}px` }}
                    teamColor={localTeamColor}
                  />
                );
              })()}
              {/* Remote videos - only show players who have joined video chat, sorted by team */}
              {sortPlayersByTeam(players.filter(player => remoteStreams.has(player.id)))
                .map((player) => {
                  const dims = getVideoDimensions(filmstripHeight);
                  const playerTeamColor = getPlayerTeamColor(player.id);
                  return (
                    <WebcamDisplay
                      key={player.id}
                      player={player}
                      stream={getStreamForPlayer(player.id)}
                      isLocal={false}
                      isTurn={player.id === currentTurnPlayerId}
                      isSpeaking={speakingPeers.has(player.id)}
                      size="small"
                      style={{ width: `${dims.width}px`, height: `${dims.height}px` }}
                      teamColor={playerTeamColor}
                    />
                  );
                })}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default VideoFilmstrip;
