import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronUp, Users } from 'lucide-react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useVideoUI } from '../contexts/VideoUIContext';
import { useWebcamConfig } from '../config/WebcamConfig';

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
        {isMuted && <span className="status-muted" title="Muted">🔇</span>}
        {isWebcamOff && <span className="status-cam-off" title="Camera off">📷</span>}
      </div>

      {/* Name label */}
      <div className="filmstrip-name">
        {isSelf ? 'You' : playerName}
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
          <div className="preview-name">{isSelf ? 'You' : playerName}</div>
        </div>
      )}
    </div>
  );
};

const VideoFilmstrip: React.FC = () => {
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
      name: myPlayer?.name || 'You',
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
      name: player?.name || 'Player',
      isSelf: false,
      isMuted: false, // We don't know remote mute state
      isWebcamOff: !stream.getVideoTracks().some(t => t.enabled)
    });
  });

  return (
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
            <span>Show Video ({connectedCount} connected)</span>
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
            title="Drag to resize"
          />

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
  );
};

export default VideoFilmstrip;
