import React, { useState, useRef, useEffect } from 'react';
import { Grid, User, Users, Mic, MicOff, Camera, CameraOff, VideoOff, X, Maximize2 } from 'lucide-react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useWebcamConfig } from '../config/WebcamConfig';
import { getPopupLayoutPreference, savePopupLayoutPreference } from '../hooks/useVideoPreferences';

type LayoutMode = 'grid' | 'speaker' | 'spotlight';

interface VideoFeedData {
  id: string;
  stream: MediaStream | null;
  name: string;
  isSelf: boolean;
  isMuted: boolean;
  isWebcamOff: boolean;
  ballColor?: string;
}

interface PopupVideoFeedProps {
  feed: VideoFeedData;
  isLarge?: boolean;
  onClick?: () => void;
}

const PopupVideoFeed: React.FC<PopupVideoFeedProps> = ({ feed, isLarge = false, onClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && feed.stream) {
      videoRef.current.srcObject = feed.stream;
      // Rely on autoPlay attribute - no explicit play() to avoid AbortError race conditions
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [feed.stream]);

  const hasVideo = feed.stream && feed.stream.getVideoTracks().length > 0 && feed.stream.getVideoTracks()[0].enabled;
  const borderColor = feed.ballColor || (feed.isSelf ? '#00d9ff' : '#475569');

  return (
    <div
      className={`popup-video-feed ${isLarge ? 'large' : ''} ${feed.isSelf ? 'self' : ''}`}
      style={{ '--border-color': borderColor } as React.CSSProperties}
      onClick={onClick}
    >
      {hasVideo && !feed.isWebcamOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={feed.isSelf}
          className="popup-video"
        />
      ) : (
        <div className="popup-avatar">
          <span>{feed.name.charAt(0).toUpperCase()}</span>
        </div>
      )}

      {/* Status indicators */}
      <div className="popup-status">
        {feed.isMuted && <span className="status-muted">🔇</span>}
        {feed.isWebcamOff && <span className="status-cam-off">📷</span>}
      </div>

      {/* Name label */}
      <div className="popup-name">
        {feed.isSelf ? 'You' : feed.name}
        {feed.isSelf && <span className="you-badge">YOU</span>}
      </div>

      {/* Click hint for spotlight mode */}
      {onClick && (
        <div className="popup-click-hint">
          <Maximize2 className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

interface EnhancedPopupContentProps {
  roomCode?: string;
  onClose?: () => void;
}

const EnhancedPopupContent: React.FC<EnhancedPopupContentProps> = ({ roomCode, onClose }) => {
  const {
    isVideoEnabled,
    localStream,
    remoteStreams,
    isMicrophoneMuted,
    isWebcamActive,
    toggleMicrophone,
    toggleWebcam,
    disableVideoChat
  } = useWebRTC();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(getPopupLayoutPreference());
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  // Save layout preference when it changes
  useEffect(() => {
    savePopupLayoutPreference(layoutMode);
  }, [layoutMode]);

  const config = useWebcamConfig();
  const players = config.getPlayers?.() || [];

  // Player colors
  const PLAYER_COLORS = ['#FF4444', '#4444FF', '#44FF44', '#FFFF44', '#FF44FF', '#44FFFF', '#FF8844', '#8844FF'];

  const getBallColor = (playerId: string) => {
    const index = players.findIndex(p => p.id === playerId);
    return index >= 0 ? PLAYER_COLORS[index % PLAYER_COLORS.length] : undefined;
  };

  // Build list of video feeds
  const videoFeeds: VideoFeedData[] = [];

  // Add self
  if (isVideoEnabled && localStream) {
    const myPlayer = players.find(p => p.isMe);
    videoFeeds.push({
      id: 'self',
      stream: localStream,
      name: myPlayer?.name || 'You',
      isSelf: true,
      isMuted: isMicrophoneMuted,
      isWebcamOff: !isWebcamActive,
      ballColor: '#00d9ff'
    });
  }

  // Add remote streams - iterate over players and look up by socketId
  players.filter(p => !p.isMe).forEach((player) => {
    const stream = remoteStreams.get(player.socketId) || remoteStreams.get(player.id);
    if (stream) {
      videoFeeds.push({
        id: player.socketId || player.id,
        stream,
        name: player.name || 'Player',
        isSelf: false,
        isMuted: false,
        isWebcamOff: !stream.getVideoTracks().some(t => t.enabled),
        ballColor: getBallColor(player.id)
      });
    }
  });

  const connectedCount = videoFeeds.length;

  // Get grid column count based on participant count
  const getGridCols = () => {
    if (connectedCount <= 1) return 1;
    if (connectedCount <= 4) return 2;
    if (connectedCount <= 9) return 3;
    return 4;
  };

  // Render based on layout mode
  const renderLayout = () => {
    switch (layoutMode) {
      case 'speaker': {
        // Speaker view: Active speaker large, others in filmstrip
        const speakerFeed = videoFeeds.find(f => !f.isSelf) || videoFeeds[0];
        const otherFeeds = videoFeeds.filter(f => f.id !== speakerFeed?.id);

        return (
          <div className="popup-speaker-layout">
            <div className="speaker-main">
              {speakerFeed && (
                <PopupVideoFeed feed={speakerFeed} isLarge />
              )}
            </div>
            <div className="speaker-strip">
              {otherFeeds.map(feed => (
                <PopupVideoFeed
                  key={feed.id}
                  feed={feed}
                  onClick={() => {
                    // Could switch speaker here
                  }}
                />
              ))}
            </div>
          </div>
        );
      }

      case 'spotlight': {
        // Spotlight view: Click any participant to enlarge
        const spotlightFeed = spotlightId
          ? videoFeeds.find(f => f.id === spotlightId)
          : null;
        const otherFeeds = spotlightFeed
          ? videoFeeds.filter(f => f.id !== spotlightId)
          : videoFeeds;

        if (spotlightFeed) {
          return (
            <div className="popup-spotlight-layout">
              <div className="spotlight-main">
                <PopupVideoFeed
                  feed={spotlightFeed}
                  isLarge
                  onClick={() => setSpotlightId(null)}
                />
              </div>
              <div className="spotlight-sidebar">
                {otherFeeds.map(feed => (
                  <PopupVideoFeed
                    key={feed.id}
                    feed={feed}
                    onClick={() => setSpotlightId(feed.id)}
                  />
                ))}
              </div>
            </div>
          );
        }

        // No spotlight selected - show grid with click handlers
        return (
          <div className={`popup-grid cols-${getGridCols()}`}>
            {videoFeeds.map(feed => (
              <PopupVideoFeed
                key={feed.id}
                feed={feed}
                onClick={() => setSpotlightId(feed.id)}
              />
            ))}
          </div>
        );
      }

      case 'grid':
      default:
        return (
          <div className={`popup-grid cols-${getGridCols()}`}>
            {videoFeeds.map(feed => (
              <PopupVideoFeed key={feed.id} feed={feed} />
            ))}
          </div>
        );
    }
  };

  return (
    <div className="enhanced-popup">
      {/* Header */}
      <div className="popup-header">
        <div className="popup-header-left">
          <div className="popup-logo">
            <img
              src={`${window.location.origin}${import.meta.env.BASE_URL}mascot.webp`}
              alt="Prime Suspect"
              className="popup-mascot"
            />
            <div className="popup-logo-text">
              <span className="logo-think">Think</span><span className="logo-alike">Alike</span>
              <span className="logo-by"> by </span>
              <span className="logo-gamebuddies">GameBuddies</span><span className="logo-io">.io</span>
            </div>
          </div>
          <div className="popup-room-info">
            {roomCode && <span className="room-code">Room: {roomCode}</span>}
            <span className="connected-count">
              <Users className="w-4 h-4" />
              {connectedCount} connected
            </span>
          </div>
        </div>

        <div className="popup-header-right">
          {/* Layout selector */}
          <div className="layout-selector">
            <button
              className={`layout-btn ${layoutMode === 'grid' ? 'active' : ''}`}
              onClick={() => setLayoutMode('grid')}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              className={`layout-btn ${layoutMode === 'speaker' ? 'active' : ''}`}
              onClick={() => setLayoutMode('speaker')}
              title="Speaker View"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              className={`layout-btn ${layoutMode === 'spotlight' ? 'active' : ''}`}
              onClick={() => { setLayoutMode('spotlight'); setSpotlightId(null); }}
              title="Spotlight View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>


          {/* Video control buttons */}
          <div className="header-video-controls">
            <button
              className={`header-video-btn ${isMicrophoneMuted ? 'muted' : ''}`}
              onClick={toggleMicrophone}
              title={isMicrophoneMuted ? 'Unmute' : 'Mute'}
            >
              {isMicrophoneMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              className={`header-video-btn ${!isWebcamActive ? 'off' : ''}`}
              onClick={toggleWebcam}
              title={isWebcamActive ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isWebcamActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            </button>
            <button
              className="header-video-btn leave"
              onClick={() => { disableVideoChat(); onClose?.(); }}
              title="Leave Video Chat"
            >
              <VideoOff className="w-4 h-4" />
            </button>
          </div>
          {onClose && (
            <button className="popup-close-btn" onClick={onClose} title="Close">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="popup-content">
        {renderLayout()}
      </div>

      {/* Footer branding */}
      <div className="popup-footer">
        <div className="popup-branding">
          <img
            src={`${window.location.origin}${import.meta.env.BASE_URL}mascot.webp`}
            alt=""
            className="popup-branding-mascot"
          />
          <span className="brand-think">Think</span><span className="brand-alike">Alike</span>
          <span className="by"> by </span>
          <span className="game">Game</span><span className="buddies">Buddies</span><span className="io">.io</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPopupContent;
