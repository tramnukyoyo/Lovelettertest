import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Eye, EyeOff, Video, VideoOff, Mic, MicOff, Camera, CameraOff, Settings } from 'lucide-react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useVideoUI } from '../contexts/VideoUIContext';

interface VideoFeed {
  id: string;
  playerName: string;
  stream: MediaStream | null;
  isActive: boolean;
  isSelf: boolean;
  isWebcamOn?: boolean;
  connectionType?: string;
}

interface MobileVideoGridProps {
  players: any[];
  onlineCount?: number;
  isPopout?: boolean;
  isVideoEnabled?: boolean;
  onJoinVideoChat?: () => void;
}

const VideoTile: React.FC<{ feed: VideoFeed; toggleMicrophone?: () => void; isMicrophoneMuted?: boolean }> = ({ feed, toggleMicrophone, isMicrophoneMuted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLocallyMuted, setIsLocallyMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);

  useEffect(() => {
    if (videoRef.current && feed.stream) {
      videoRef.current.srcObject = feed.stream;
    }
  }, [feed.stream]);

  useEffect(() => {
    if (videoRef.current && !feed.isSelf) {
      videoRef.current.muted = isLocallyMuted;
    }
  }, [isLocallyMuted, feed.isSelf]);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocallyMuted(!isLocallyMuted);
  };

  const handleToggleVideoHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVideoHidden(!isVideoHidden);
  };

  const handleSelfMicToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggleMicrophone) {
      toggleMicrophone();
    }
  };

  return (
    <div className="video-tile">
      {/* Video Container */}
      <div className="video-inner">
        {feed.stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={feed.isSelf || isLocallyMuted} // Always mute self to prevent echo
            className="video-element"
            style={{ display: isVideoHidden ? 'none' : 'block' }}
          />
        )}
        
        {(isVideoHidden || !feed.stream) && (
          <div className="video-placeholder">
            <span>{isVideoHidden ? '🙈' : '📹'}</span>
          </div>
        )}

        {/* Active Indicator Dot */}
        <div className={`status-dot ${feed.isActive ? 'active' : 'inactive'}`} />

        {/* Player Name Overlay */}
        <div className="player-name-overlay">
          <span className="player-name">{feed.playerName}</span>
          {feed.isSelf && <span className="self-badge">You</span>}
        </div>

        {/* Video Controls Overlay */}
        <div className="video-controls">
          {/* Mute/Unmute Audio (for other players) */}
          {!feed.isSelf && (
            <button
              className="control-btn mute-btn"
              onClick={handleToggleMute}
              title={isLocallyMuted ? "Unmute Audio" : "Mute Audio"}
              aria-label={isLocallyMuted ? `Unmute ${feed.playerName}'s audio` : `Mute ${feed.playerName}'s audio`}
            >
              {isLocallyMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {/* Mute/Unmute Mic (self only) */}
          {feed.isSelf && (
            <button
              className={`control-btn mic-btn ${isMicrophoneMuted ? 'muted-state' : ''}`}
              onClick={handleSelfMicToggle}
              title="Toggle Microphone"
              aria-label="Toggle microphone"
            >
              {isMicrophoneMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Hide Video Toggle */}
          <button
            className="control-btn hide-btn"
            onClick={handleToggleVideoHide}
            title={isVideoHidden ? "Show Video" : "Hide Video"}
            aria-label={isVideoHidden ? `Show ${feed.playerName}'s video` : `Hide ${feed.playerName}'s video`}
          >
            {isVideoHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MobileVideoGrid: React.FC<MobileVideoGridProps> = ({
  players = [],
  onJoinVideoChat = () => {},
}) => {
  // Get WebRTC context for video controls
  const {
    isVideoEnabled,
    isMicrophoneMuted,
    isWebcamActive,
    prepareVideoChat,
    disableVideoChat,
    toggleMicrophone,
    toggleWebcam
  } = useWebRTC();

  // Get Video UI context for settings/popout
  const videoUI = useVideoUI();

  // Create video feeds from players
  const videoFeeds = useMemo<VideoFeed[]>(() => {
    return players
      .map((player) => ({
        id: player.id || player.socketId,
        playerName: player.name || player.playerName || 'Unknown',
        stream: player.stream || null,
        isActive: player.isActive || false,
        isSelf: player.isSelf || false,
        isWebcamOn: player.isWebcamOn !== false,
      }))
      .filter((feed) => feed.stream !== null || feed.isSelf);
  }, [players]);

  if (videoFeeds.length === 0) {
    return (
      <div className="mobile-video-grid-empty">
        <div className="empty-state">
          <p>No camera feeds available</p>
          {!isVideoEnabled ? (
            <>
              <small>Connect to see other players</small>
              <button className="join-video-btn" onClick={onJoinVideoChat}>
                <Video className="w-5 h-5" />
                <span>Join Video Chat</span>
              </button>
            </>
          ) : (
            <small>Players will appear here when they enable their cameras</small>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-video-grid-container">
      {/* Grid of video feeds */}
      <div className="mobile-video-grid">
        {videoFeeds.map((feed) => (
          <VideoTile 
            key={feed.id} 
            feed={feed} 
            toggleMicrophone={feed.isSelf ? toggleMicrophone : undefined}
            isMicrophoneMuted={feed.isSelf ? isMicrophoneMuted : undefined}
          />
                ))}
              </div>
        
              {/* Bottom Control Bar - Clean Icon-Only Design */}
              <div className="mobile-video-actions-wrapper">
                <div className="mobile-video-actions">
                  {isVideoEnabled ? (
                    <>
                      {/* Microphone Toggle */}
                      <button
                        onClick={toggleMicrophone}
                        className={`mobile-control-btn ${isMicrophoneMuted ? 'muted' : ''}`}
                        title={isMicrophoneMuted ? 'Unmute microphone' : 'Mute microphone'}
                        aria-label={isMicrophoneMuted ? 'Unmute microphone' : 'Mute microphone'}
                      >
                        {isMicrophoneMuted ? (
                          <MicOff className="w-5 h-5" />
                        ) : (
                          <Mic className="w-5 h-5" />
                        )}
                      </button>
        
                      {/* Camera Toggle */}
                      <button
                        onClick={toggleWebcam}
                        className={`mobile-control-btn ${!isWebcamActive ? 'off' : ''}`}
                        title={isWebcamActive ? 'Turn camera off' : 'Turn camera on'}
                        aria-label={isWebcamActive ? 'Turn camera off' : 'Turn camera on'}
                      >
                        {isWebcamActive ? (
                          <Camera className="w-5 h-5" />
                        ) : (
                          <CameraOff className="w-5 h-5" />
                        )}
                      </button>
        
                      {/* Settings */}
                      <button
                        onClick={videoUI.openSettings}
                        className="mobile-control-btn"
                        title="Video settings"
                        aria-label="Video settings"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
        
                      {/* Leave Video - Danger Action */}
                      <button
                        onClick={disableVideoChat}
                        className="mobile-control-btn danger"
                        title="Leave video chat"
                        aria-label="Leave video chat"
                      >
                        <VideoOff className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    /* Join Video Button when not connected */
                    <button
                      onClick={prepareVideoChat}
                      className="mobile-join-video-btn"
                    >
                      <Video className="w-6 h-6" />
                      <span>Join Video Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        };
export default MobileVideoGrid;
