import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, Users, ExternalLink } from 'lucide-react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useVideoUI } from '../contexts/VideoUIContext';
import { useWebcamConfig } from '../config/WebcamConfig';
import { getTranslation, getCurrentLanguage } from '../utils/translations';
import EnhancedPopupContent from './EnhancedPopupContent';

// Filmstrip height bounds
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 300;
const DEFAULT_HEIGHT = 110;
const COLLAPSED_SAFE_SPACE = 40; // match collapsed filmstrip height (2.5rem)


interface VideoThumbnailProps {
  stream: MediaStream | null;
  playerName: string;
  isSelf?: boolean;
  isMuted?: boolean;
  isWebcamOff?: boolean;
  ballColor?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  stream,
  playerName,
  isSelf = false,
  isMuted = false,
  isWebcamOff = false,
  thumbnailWidth,
  thumbnailHeight,
  ballColor
}) => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // Rely on autoPlay attribute - no explicit play() to avoid AbortError race conditions
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
  const borderColor = ballColor || (isSelf ? '#00d9ff' : '#475569');

  // Build style object with dynamic dimensions
  const thumbnailStyle: React.CSSProperties = {
    '--border-color': borderColor
  } as React.CSSProperties;

  if (thumbnailWidth && thumbnailHeight) {
    thumbnailStyle.width = `${thumbnailWidth}px`;
    thumbnailStyle.height = `${thumbnailHeight}px`;
  }

  return (
    <div
      className={`filmstrip-thumbnail ${isSelf ? 'self' : ''} ${isHovered ? 'hovered' : ''}`}
      style={thumbnailStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hasVideo && !isWebcamOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="filmstrip-video"
        />
      ) : (
        <div className="filmstrip-avatar">
          <span>{playerName.charAt(0).toUpperCase()}</span>
        </div>
      )}

      {/* Status indicators */}
      <div className="filmstrip-status">
        {isMuted && <span className="status-muted" title={t('video.muted')}>🔇</span>}
        {isWebcamOff && <span className="status-cam-off" title={t('video.cameraOffTitle')}>📷</span>}
      </div>

      {/* Name label */}
      <div className="filmstrip-name">
        {isSelf ? t('video.you') : playerName}
      </div>

      {/* Hover preview */}
      {isHovered && (
        <div className="filmstrip-preview">
          {hasVideo && !isWebcamOff ? (
            <video
              autoPlay
              playsInline
              muted
              ref={(el) => {
                if (el && stream) {
                  el.srcObject = stream;
                  // autoPlay attribute handles playback - no explicit play()
                }
              }}
              className="preview-video"
            />
          ) : (
            <div className="preview-avatar">
              <span>{playerName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="preview-name">{isSelf ? t('video.you') : playerName}</div>
        </div>
      )}
    </div>
  );
};

const VideoFilmstrip: React.FC = () => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);
  const {
    isVideoEnabled,
    localStream,
    remoteStreams,
    isMicrophoneMuted,
    isWebcamActive
  } = useWebRTC();

  const {
    isFilmstripExpanded,
    toggleFilmstrip,
    setOnPopupRequested,
    setPopupOpen,
    isPopupOpen
  } = useVideoUI();

  const config = useWebcamConfig();
  const players = config.getPlayers?.() || [];

  // Resizable filmstrip state
  const [filmstripHeight, setFilmstripHeight] = useState(() => {
    const saved = localStorage.getItem('filmstrip-height');
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
  });
  const [isResizing, setIsResizing] = useState(false);
  const filmstripHeightRef = useRef(filmstripHeight);

  // Popout window state
  const [popoutWindow, setPopoutWindow] = useState<Window | null>(null);
  const popoutContainerRef = useRef<HTMLElement | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    filmstripHeightRef.current = filmstripHeight;
  }, [filmstripHeight]);

  // Sync resize state to layout so sidebar + filmstrip animate together
  useEffect(() => {
    const root = document.querySelector('.app-root');
    if (!root) return;
    if (isResizing) {
      root.classList.add('filmstrip-resizing');
    } else {
      root.classList.remove('filmstrip-resizing');
    }
    return () => root.classList.remove('filmstrip-resizing');
  }, [isResizing]);

  // Calculate thumbnail dimensions based on filmstrip height
  const thumbnailHeight = filmstripHeight - 16; // 8px padding top + bottom
  const thumbnailWidth = Math.round(thumbnailHeight * 1.32); // ~4:3 aspect ratio

  // Resize handler
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

  // Open popout window
  const handlePopout = useCallback(() => {
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

    newWindow.document.open();
    newWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prime Suspect - Video Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      color: #fff;
      min-height: 100vh;
    }
    #webcam-popout-root {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .w-4 { width: 1rem; } .h-4 { height: 1rem; }
    .w-5 { width: 1.25rem; } .h-5 { height: 1.25rem; }
    .w-8 { width: 2rem; } .h-8 { height: 2rem; }
    svg { display: inline-block; vertical-align: middle; stroke: currentColor; stroke-width: 2; fill: none; }
  </style>
</head>
<body>
  <div id="webcam-popout-root"></div>
</body>
</html>
    `);
    newWindow.document.close();

    // Copy parent styles
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          if (sheet.cssRules) {
            const style = newWindow.document.createElement('style');
            style.textContent = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
            newWindow.document.head.appendChild(style);
          } else if (sheet.href) {
            const link = newWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            newWindow.document.head.appendChild(link);
          }
        } catch (e) {
          if (sheet.href) {
            const link = newWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            newWindow.document.head.appendChild(link);
          }
        }
      });
    } catch (error) {
      console.warn('[Popup] Failed to copy styles:', error);
    }

    const container = newWindow.document.getElementById('webcam-popout-root');
    if (container) {
      setPopoutWindow(newWindow);
      popoutContainerRef.current = container;

      // Silent audio to prevent browser throttling
      setTimeout(() => {
        try {
          const audioContext = new ((newWindow as any).AudioContext || (newWindow as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
          const buffer = audioContext.createBuffer(1, 1, 22050);
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(audioContext.destination);
          source.start(0);
          (newWindow as any)._silentAudioCtx = audioContext;
          (newWindow as any)._silentAudioSrc = source;
        } catch (e) { /* silent failure */ }
      }, 100);

      newWindow.addEventListener('beforeunload', () => {
        try {
          (newWindow as any)._silentAudioSrc?.stop();
          (newWindow as any)._silentAudioSrc?.disconnect();
          (newWindow as any)._silentAudioCtx?.close();
        } catch (e) { /* cleanup */ }
        setPopoutWindow(null);
        popoutContainerRef.current = null;
      });
    }
  }, [popoutWindow]);

  // Close popout
  const handleClosePopout = useCallback(() => {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.close();
    }
    setPopoutWindow(null);
    popoutContainerRef.current = null;
  }, [popoutWindow]);

  // Register popup handler with VideoUIContext
  useEffect(() => {
    if (isVideoEnabled) {
      setOnPopupRequested(() => handlePopout);
    }
    return () => setOnPopupRequested(null);
  }, [isVideoEnabled, setOnPopupRequested, handlePopout]);

  // Keyboard shortcut: P to toggle popout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === 'p' || e.key === 'P') {
        handlePopout();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePopout]);

  // Sync popup state with VideoUIContext
  useEffect(() => {
    setPopupOpen(!!popoutWindow);
  }, [popoutWindow, setPopupOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (popoutWindow && !popoutWindow.closed) {
        popoutWindow.close();
      }
    };
  }, [popoutWindow]);

  // Player colors
  const PLAYER_COLORS = ['#FF4444', '#4444FF', '#44FF44', '#FFFF44', '#FF44FF', '#44FFFF', '#FF8844', '#8844FF'];

  const getBallColor = (playerId: string) => {
    const index = players.findIndex(p => p.id === playerId);
    return index >= 0 ? PLAYER_COLORS[index % PLAYER_COLORS.length] : undefined;
  };

  // Get connected count
  const connectedCount = remoteStreams.size + (isVideoEnabled ? 1 : 0);

  // Expose current filmstrip height to the layout for safe padding (chat/sidebar)
  useEffect(() => {
    const safeSpace = isFilmstripExpanded ? filmstripHeight : COLLAPSED_SAFE_SPACE;
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

  // Hide filmstrip completely until video is active
  // Header has the "Join Video" button - no need for duplicate here
  if (!isVideoEnabled) {
    return null;
  }

  // Build list of video feeds
  const videoFeeds: Array<{
    id: string;
    stream: MediaStream | null;
    name: string;
    isSelf: boolean;
    isMuted: boolean;
    isWebcamOff: boolean;
  }> = [];

  // Add self
  if (isVideoEnabled && localStream) {
    const myPlayer = players.find(p => p.isMe);
    videoFeeds.push({
      id: 'self',
      stream: localStream,
      name: myPlayer?.name || t('video.you'),
      isSelf: true,
      isMuted: isMicrophoneMuted,
      isWebcamOff: !isWebcamActive
    });
  }

  // Add remote streams
  remoteStreams.forEach((stream, oderId) => {
    const player = players.find(p => p.id === oderId);
    videoFeeds.push({
      id: oderId,
      stream,
      name: player?.name || t('video.player'),
      isSelf: false,
      isMuted: false, // We don't know remote mute state
      isWebcamOff: !stream.getVideoTracks().some(t => t.enabled)
    });
  });

  return (
    <>
      {/* Render popup content via portal if popup window is open */}
      {popoutWindow && !popoutWindow.closed && popoutContainerRef.current && (
        createPortal(
          <EnhancedPopupContent
            roomCode={config.getRoomCode?.()}
            onClose={handleClosePopout}
          />,
          popoutContainerRef.current
        )
      )}

      {/* Filmstrip UI - hide when popup is open */}
      {!isPopupOpen && (
        <div
          className={`filmstrip-container ${isFilmstripExpanded ? 'expanded' : 'collapsed'} ${isResizing ? 'resizing' : ''}`}
          style={isFilmstripExpanded ? { height: `${filmstripHeight}px` } : undefined}
        >
          {/* Collapsed mini bar */}
          {!isFilmstripExpanded && (
            <div className="filmstrip-mini-bar">
              <button onClick={toggleFilmstrip} className="filmstrip-expand-btn">
                <ChevronUp className="w-4 h-4" />
                <Users className="w-4 h-4" />
                <span>{t('video.showVideoConnected').replace('{count}', String(connectedCount))}</span>
              </button>
            </div>
          )}

          {/* Expanded filmstrip */}
          {isFilmstripExpanded && (
            <>
              {/* Resize handle - drag to resize */}
              <div
                className="filmstrip-resize-handle"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                title={t('video.dragToResize')}
              />

              {/* Popout button */}
              <button
                className="filmstrip-popout-btn"
                onClick={handlePopout}
                title={t('video.popOutVideo') || 'Pop out video (P)'}
              >
                <ExternalLink size={14} />
              </button>

              <div className="filmstrip-content">
                {/* Scrollable thumbnails */}
                <div className="filmstrip-scroll">
                  {videoFeeds.map((feed) => (
                    <VideoThumbnail
                      key={feed.id}
                      stream={feed.stream}
                      playerName={feed.name}
                      isSelf={feed.isSelf}
                      isMuted={feed.isMuted}
                      isWebcamOff={feed.isWebcamOff}
                      ballColor={feed.isSelf ? '#00d9ff' : getBallColor(feed.id)}
                      thumbnailWidth={thumbnailWidth}
                      thumbnailHeight={thumbnailHeight}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default VideoFilmstrip;
