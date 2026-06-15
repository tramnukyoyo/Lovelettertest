/**
 * Video Filmstrip
 *
 * Horizontal strip of video feeds at the bottom of the screen.
 * Collapsible to save screen space.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { useVideoUI } from '../../contexts/VideoUIContext';
import WebcamDisplay from './WebcamDisplay';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import type { Team } from '../../types';
import { t } from '../../utils/translations';

// Filmstrip resize constants
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 300;
const DEFAULT_HEIGHT = 110;
const COLLAPSED_SAFE_SPACE = 40;

// The filmstrip may never eat more than 40% of the viewport — beyond that the
// stage drops into its degradation ladder and lobby settings become cramped.
const maxFilmstripHeight = () =>
  Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(window.innerHeight * 0.4)));

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
  roomCode: _roomCode = '',
  localPlayerName,
  currentTurnPlayerId,
  className = '',
  teams = [],
  mySocketId
}) => {
  const { localStream, remoteStreams, speakingPeers, connectingPeers, isVideoEnabled, isVideoPrepairing } = useWebRTC();
  const { isFilmstripExpanded, toggleFilmstrip, isStreamerBroadcastOpen } = useVideoUI();

  const getPlayerTeamColor = (playerId: string): string | undefined => {
    for (const team of teams) {
      if (team.playerIds.includes(playerId)) {
        return team.color;
      }
    }
    return undefined;
  };

  const sortPlayersByTeam = <T extends { id: string }>(playerList: T[]): T[] => {
    if (teams.length === 0) return playerList;
    return [...playerList].sort((a, b) => {
      const teamA = teams.findIndex(t => t.playerIds.includes(a.id));
      const teamB = teams.findIndex(t => t.playerIds.includes(b.id));
      if (teamA === -1 && teamB === -1) return 0;
      if (teamA === -1) return 1;
      if (teamB === -1) return -1;
      return teamA - teamB;
    });
  };

  const [filmstripHeight, setFilmstripHeight] = useState(() => {
    const saved = localStorage.getItem('filmstrip-height');
    const height = saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
    return Math.max(MIN_HEIGHT, Math.min(maxFilmstripHeight(), height));
  });
  const [isResizing, setIsResizing] = useState(false);
  const filmstripHeightRef = useRef(filmstripHeight);

  const getStreamForPlayer = (playerId: string): MediaStream | null => {
    return remoteStreams.get(playerId) || null;
  };

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = filmstripHeightRef.current;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;
      const delta = startY - currentY;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(maxFilmstripHeight(), startHeight + delta));
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

  useEffect(() => {
    filmstripHeightRef.current = filmstripHeight;
  }, [filmstripHeight]);

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

  if (!isVideoEnabled && !isVideoPrepairing) {
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
        title={t('videoControl.showVideos')}
      >
        <div className="filmstrip-resize-handle" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: filmstripHeight, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: isResizing ? 0 : 0.3 }}
      className={`video-filmstrip ${isResizing ? 'resizing' : ''} ${className}`}
      style={{ height: `${filmstripHeight}px` }}
    >
      <div
        className="filmstrip-resize-handle"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
        onDoubleClick={toggleFilmstrip}
        title={t('videoControl.resizeHint')}
      />

      <div className="video-filmstrip-feeds">
        {players.length === 0 && !localStream ? (
          <div className="video-filmstrip-empty">
            <p>{t('videoControl.noFeeds')}</p>
          </div>
        ) : (
          <>
            {localStream && (() => {
              const dims = getVideoDimensions(filmstripHeight);
              const localTeamColor = mySocketId ? getPlayerTeamColor(mySocketId) : undefined;
              const localIsSpeaking = !!mySocketId && speakingPeers.has(mySocketId);
              return (
                <WebcamDisplay
                  player={{ id: 'local', name: localPlayerName || 'You' }}
                  stream={localStream}
                  isLocal
                  isSpeaking={localIsSpeaking}
                  size="small"
                  style={{ width: `${dims.width}px`, height: `${dims.height}px` }}
                  teamColor={localTeamColor}
                />
              );
            })()}
            {sortPlayersByTeam(players.filter(player => remoteStreams.has(player.id) || connectingPeers.has(player.id)))
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
  );
};

// memo: blocks parent-driven re-renders from lobby state ticks. WebRTC context
// changes (streams, speaking state) still re-render this as they should.
export default React.memo(VideoFilmstrip);
