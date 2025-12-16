import React from 'react';
import { Video, VideoOff, Mic, MicOff, Camera, CameraOff, ExternalLink, Settings } from 'lucide-react';
import { useWebRTC } from '../contexts/WebRTCContext';

interface VideoControlClusterProps {
  onOpenSettings?: () => void;
  onOpenPopout?: () => void;
  onToggleFilmstrip?: () => void;
  isFilmstripExpanded?: boolean;
}

const VideoControlCluster: React.FC<VideoControlClusterProps> = ({
  onOpenSettings,
  onOpenPopout,
  onToggleFilmstrip,
  isFilmstripExpanded = false
}) => {
  const {
    isVideoEnabled,
    isVideoPrepairing,
    isMicrophoneMuted,
    isWebcamActive,
    remoteStreams,
    prepareVideoChat,
    disableVideoChat,
    toggleMicrophone,
    toggleWebcam
  } = useWebRTC();

  // Count connected peers
  const connectedCount = remoteStreams.size + (isVideoEnabled ? 1 : 0); // +1 for self

  // If video is not enabled and not preparing, show join button
  if (!isVideoEnabled && !isVideoPrepairing) {
    return (
      <div className="video-control-cluster">
        <button
          onClick={prepareVideoChat}
          className="video-join-btn"
          title="Join Video Chat"
        >
          <Video className="w-4 h-4" />
          <span className="video-join-text">Join Video</span>
        </button>
      </div>
    );
  }

  // If preparing (in settings preview), show minimal indicator
  if (isVideoPrepairing) {
    return (
      <div className="video-control-cluster">
        <div className="video-preparing-badge">
          <Video className="w-4 h-4" />
          <span>Setting up...</span>
        </div>
      </div>
    );
  }

  // Video is enabled - show full controls
  return (
    <div className="video-control-cluster">
      {/* Video badge with connected count - click to toggle filmstrip */}
      <button
        onClick={onToggleFilmstrip}
        className={`video-badge-btn ${isFilmstripExpanded ? 'expanded' : ''}`}
        title={isFilmstripExpanded ? 'Collapse video strip' : 'Expand video strip'}
      >
        <Video className="w-4 h-4" />
        <span className="video-badge-count">{connectedCount}</span>
      </button>

      {/* Microphone toggle */}
      <button
        onClick={toggleMicrophone}
        className={`video-control-btn ${isMicrophoneMuted ? 'muted' : ''}`}
        title={isMicrophoneMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMicrophoneMuted ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Camera toggle */}
      <button
        onClick={toggleWebcam}
        className={`video-control-btn ${!isWebcamActive ? 'off' : ''}`}
        title={isWebcamActive ? 'Turn camera off' : 'Turn camera on'}
      >
        {isWebcamActive ? (
          <Camera className="w-4 h-4" />
        ) : (
          <CameraOff className="w-4 h-4" />
        )}
      </button>

      {/* Leave video button */}
      <button
        onClick={disableVideoChat}
        className="video-control-btn leave"
        title="Leave video chat"
      >
        <VideoOff className="w-4 h-4" />
      </button>

      {/* Pop-out button */}
      {onOpenPopout && (
        <button
          onClick={onOpenPopout}
          className="video-control-btn"
          title="Open video in popup window"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}

      {/* Settings button */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="video-control-btn"
          title="Video settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default VideoControlCluster;
