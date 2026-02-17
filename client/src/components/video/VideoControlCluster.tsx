/**
 * Video Control Cluster
 *
 * Three-state video controls matching BingoBuddies/ClueScale/ThinkAlike pattern:
 * 1. NOT JOINED: Shows "Join Video" button
 * 2. PREPARING: Shows "Setting up..." badge with pulse
 * 3. ACTIVE: Shows full controls (filmstrip, mic, camera, leave)
 */

import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  Settings,
  ExternalLink,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff
} from 'lucide-react';

interface VideoControlClusterProps {
  // Three-state flow
  isVideoEnabled?: boolean;       // Whether video chat is active (joined)
  isVideoPrepairing?: boolean;
  onPrepareVideo?: () => void;
  onDisableVideo?: () => void;

  // Active state controls
  isFilmstripExpanded?: boolean;
  onToggleFilmstrip?: () => void;
  onOpenSettings?: () => void;
  onOpenPopout?: () => void;
  isCameraEnabled?: boolean;      // Whether camera track is on
  onToggleVideo?: () => void;
  isAudioEnabled?: boolean;
  onToggleAudio?: () => void;
  compact?: boolean;
  className?: string;
}

const VideoControlCluster: React.FC<VideoControlClusterProps> = ({
  isVideoEnabled = false,
  isVideoPrepairing = false,
  onPrepareVideo,
  onDisableVideo,
  isFilmstripExpanded = false,
  onToggleFilmstrip,
  onOpenSettings,
  onOpenPopout,
  isCameraEnabled = true,
  onToggleVideo,
  isAudioEnabled = true,
  onToggleAudio,
  compact = false,
  className = ''
}) => {
  // ============================================================================
  // State 1: NOT JOINED - Show "Join Video" button
  // ============================================================================
  if (!isVideoEnabled && !isVideoPrepairing) {
    return (
      <div className={`video-control-cluster ${className}`}>
        <button
          onClick={onPrepareVideo}
          className="video-join-btn"
          title="Join video chat"
        >
          <Video className="w-4 h-4" />
          <span className="video-join-text">Join Video</span>
        </button>
      </div>
    );
  }

  // ============================================================================
  // State 2: PREPARING - Show "Setting up..." badge
  // ============================================================================
  if (isVideoPrepairing) {
    return (
      <div className={`video-control-cluster ${className}`}>
        <div className="video-preparing-badge">
          <Video className="w-4 h-4" />
          <span>Setting up...</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // State 3: ACTIVE - Show full controls
  // ============================================================================
  return (
    <div className={`video-control-cluster ${compact ? 'compact' : ''} ${className}`}>
      {/* Filmstrip Toggle */}
      {onToggleFilmstrip && (
        <button
          onClick={onToggleFilmstrip}
          className="video-control-btn"
          title={isFilmstripExpanded ? 'Collapse videos' : 'Expand videos'}
        >
          {isFilmstripExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          {!compact && <span>Videos</span>}
        </button>
      )}

      {/* Video Toggle (Camera On/Off) */}
      {onToggleVideo && (
        <button
          onClick={onToggleVideo}
          className={`video-control-btn ${!isCameraEnabled ? 'off' : ''}`}
          title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraEnabled ? (
            <Video className="w-4 h-4" />
          ) : (
            <VideoOff className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Audio Toggle */}
      {onToggleAudio && (
        <button
          onClick={onToggleAudio}
          className={`video-control-btn ${!isAudioEnabled ? 'off' : ''}`}
          title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Settings */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="video-control-btn"
          title="Video settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* Leave Video */}
      {onDisableVideo && (
        <button
          onClick={onDisableVideo}
          className="video-control-btn leave"
          title="Leave video chat"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      )}

      {/* Popout */}
      {onOpenPopout && (
        <button
          onClick={onOpenPopout}
          className="video-control-btn"
          title="Pop out video"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default VideoControlCluster;
