/**
 * Video Filmstrip
 *
 * Horizontal strip of video feeds at the bottom of the screen.
 * Collapsible to save screen space.
 * Includes popout functionality for separate video window.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useWebRTC } from './adapters';
import { useVideoUI } from './adapters';
import WebcamDisplay from './WebcamDisplay';
import EnhancedPopupContent from './EnhancedPopupContent';
import type { WebcamPlayer } from './adapters';
import type { Team } from './adapters';
import { GAME_META } from './adapters';

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
  const { localStream, remoteStreams, isVideoEnabled, isVideoPrepairing } = useWebRTC();
  const { isFilmstripExpanded, toggleFilmstrip, isPopupOpen, setPopupOpen, setOnPopupRequested } = useVideoUI();

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

  // Popout window state
  const [popoutWindow, setPopoutWindow] = useState<Window | null>(null);
  const [popoutContainer, setPopoutContainer] = useState<HTMLElement | null>(null);
  const silentAudioRef = useRef<{ audioContext: AudioContext; oscillator: OscillatorNode } | null>(null);

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

  // Start silent audio loop to prevent browser throttling
  const startSilentAudio = useCallback((_targetWindow: Window) => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Silent (gain = 0)
      gainNode.gain.value = 0;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();

      silentAudioRef.current = { audioContext, oscillator };
    } catch (e) {
      console.warn('[VideoFilmstrip] Could not start silent audio:', e);
    }
  }, []);

  // Stop silent audio
  const stopSilentAudio = useCallback(() => {
    if (silentAudioRef.current) {
      silentAudioRef.current.oscillator.stop();
      silentAudioRef.current.audioContext.close();
      silentAudioRef.current = null;
    }
  }, []);

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

  // Open popout window
  const openPopout = useCallback(() => {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.focus();
      return;
    }

    const width = 1200;
    const height = 800;
    const left = Math.max(0, (screen.width - width) / 2);
    const top = Math.max(0, (screen.height - height) / 2);

    const newWindow = window.open(
      '',
      'VideoChatWindow',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,toolbar=no,menubar=no,scrollbars=no`
    );

    if (!newWindow) {
      console.error('[VideoFilmstrip] Failed to open popout window (popup blocked?)');
      return;
    }

    // Write HTML structure
    newWindow.document.open();
    newWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${GAME_META.namePrefix}${GAME_META.nameAccent} - Video Chat</title>
  <style>
    :root {
      --accent-color: ${getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#00d9ff'};
      --accent-color-rgb: ${getComputedStyle(document.documentElement).getPropertyValue('--accent-color-rgb') || '0, 217, 255'};
      --accent-primary: var(--accent-color);
      --accent-primary-rgb: var(--accent-color-rgb);
      --panel-bg: ${getComputedStyle(document.documentElement).getPropertyValue('--panel-bg') || '#1a1a2e'};
      --panel-border: ${getComputedStyle(document.documentElement).getPropertyValue('--panel-border') || '#2d2d44'};
      --text-primary: ${getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#ffffff'};
      --text-muted: ${getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#8b8b9e'};
      --hover-bg: ${getComputedStyle(document.documentElement).getPropertyValue('--hover-bg') || 'rgba(255,255,255,0.05)'};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      color: var(--text-primary);
      min-height: 100vh;
    }
    #webcam-popout-root {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    /* Inline popup icon styles - render before copied stylesheets load */
    .popup-control-btn, .popup-layout-btn, .popup-close-btn {
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; cursor: pointer;
    }
    .popup-control-btn { width: 36px; height: 36px; border-radius: 8px; color: #fff; }
    .popup-layout-btn { width: 32px; height: 32px; border-radius: 6px; color: #8b8b9e; }
    .popup-close-btn { width: 36px; height: 36px; border-radius: 8px; color: #8b8b9e; }
    .popup-control-btn svg, .popup-layout-btn svg, .popup-close-btn svg {
      width: 16px; height: 16px;
    }
    .popup-control-btn.off { background: rgba(239,68,68,0.2); color: #ef4444; }
    .popup-control-btn.leave { background: rgba(239,68,68,0.2); color: #ef4444; }
  </style>
</head>
<body>
  <div id="webcam-popout-root"></div>
</body>
</html>
    `);
    newWindow.document.close();

    // Copy data-theme from parent for game-specific CSS
    const parentTheme = document.documentElement.getAttribute('data-theme');
    if (parentTheme) {
      newWindow.document.documentElement.setAttribute('data-theme', parentTheme);
    }

    // Copy parent styles
    const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
    parentStyles.forEach(style => {
      try {
        const clone = style.cloneNode(true);
        newWindow.document.head.appendChild(clone);
      } catch (e) {
        // Ignore cross-origin stylesheet errors
      }
    });

    console.log('[VideoPopout] Copied', parentStyles.length, 'stylesheets to popup');
    console.log('[VideoPopout] data-theme:', newWindow.document.documentElement.getAttribute('data-theme'));

    // Get container for portal
    const container = newWindow.document.getElementById('webcam-popout-root');
    if (container) {
      setPopoutContainer(container);
      setPopoutWindow(newWindow);
      setPopupOpen(true);
      startSilentAudio(newWindow);
    }

    // Handle window close
    newWindow.onbeforeunload = () => {
      setPopoutWindow(null);
      setPopoutContainer(null);
      setPopupOpen(false);
      stopSilentAudio();
    };
  }, [popoutWindow, setPopupOpen, startSilentAudio, stopSilentAudio]);

  // Close popout window
  const closePopout = useCallback(() => {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.close();
    }
    setPopoutWindow(null);
    setPopoutContainer(null);
    setPopupOpen(false);
    stopSilentAudio();
  }, [popoutWindow, setPopupOpen, stopSilentAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (popoutWindow && !popoutWindow.closed) {
        popoutWindow.close();
      }
      stopSilentAudio();
    };
  }, [popoutWindow, stopSilentAudio]);

  // Register openPopout with context so keyboard shortcuts can trigger it
  useEffect(() => {
    setOnPopupRequested(() => openPopout);
    return () => setOnPopupRequested(null);
  }, [openPopout, setOnPopupRequested]);

  // Set CSS variable for filmstrip safe space (so content doesn't clip under filmstrip)
  useEffect(() => {
    const safeSpace = isFilmstripExpanded
      ? filmstripHeight
      : (isPopupOpen ? 0 : COLLAPSED_SAFE_SPACE);

    const showFilmstrip = isVideoEnabled && !isPopupOpen;
    document.documentElement.classList.toggle('has-filmstrip', showFilmstrip);
    document.documentElement.style.setProperty(
      '--filmstrip-safe-space',
      showFilmstrip ? `${safeSpace}px` : '0px'
    );

    return () => {
      document.documentElement.classList.remove('has-filmstrip');
      document.documentElement.style.setProperty('--filmstrip-safe-space', '0px');
    };
  }, [isFilmstripExpanded, filmstripHeight, isVideoEnabled, isPopupOpen]);

  // Hide filmstrip until video is active or preparing
  if (!isVideoEnabled && !isVideoPrepairing) {
    if (import.meta.env.DEV) {
      console.log('[VideoFilmstrip] Returning null - isVideoEnabled:', isVideoEnabled, 'isVideoPrepairing:', isVideoPrepairing);
    }
    return null;
  }

  // Hide filmstrip when popout is open
  if (isPopupOpen) {
    return (
      <>
        {/* Only render the portal when popout is open */}
        {popoutContainer && popoutWindow && !popoutWindow.closed && createPortal(
          <EnhancedPopupContent
            key="video-popup-portal"
            roomCode={roomCode}
            players={players}
            localPlayerName={localPlayerName}
            onClose={closePopout}
            teams={teams}
            mySocketId={mySocketId}
          />,
          popoutContainer
        )}
      </>
    );
  }

  if (!isFilmstripExpanded) {
    return (
      <div
        className={`video-filmstrip collapsed ${className}`}
        onClick={toggleFilmstrip}
        title="Click to show videos"
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
          title="Drag to resize, double-click to collapse"
        />

        {/* Popout button */}
        <button
          className="filmstrip-popout-btn"
          onClick={openPopout}
          title="Pop out video (P)"
        >
          <ExternalLink size={14} />
        </button>

        {/* Video feeds */}
        <div className="video-filmstrip-feeds">
          {players.length === 0 && !localStream ? (
            <div className="video-filmstrip-empty">
              <p>No video feeds available</p>
            </div>
          ) : (
            <>
              {/* Local stream first */}
              {localStream && (() => {
                const dims = getVideoDimensions(filmstripHeight);
                const localTeamColor = mySocketId ? getPlayerTeamColor(mySocketId) : undefined;
                return (
                  <WebcamDisplay
                    player={{ id: 'local', name: localPlayerName || 'You' }}
                    stream={localStream}
                    isLocal
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

      {/* Popout Portal */}
      {popoutContainer && popoutWindow && !popoutWindow.closed && createPortal(
        <EnhancedPopupContent
          key={`popup-${remoteStreams.size}-${Array.from(remoteStreams.keys()).join(',')}`}
          roomCode={roomCode}
          players={players}
          localPlayerName={localPlayerName}
          onClose={closePopout}
          teams={teams}
          mySocketId={mySocketId}
        />,
        popoutContainer
      )}
    </>
  );
};

export default VideoFilmstrip;
