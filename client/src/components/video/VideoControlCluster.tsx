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
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff
} from 'lucide-react';
import { getBroadcastCopy } from './broadcastCopy';

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
  onOpenBroadcast?: () => void;
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
  onOpenBroadcast,
  isCameraEnabled = true,
  onToggleVideo,
  isAudioEnabled = true,
  onToggleAudio,
  compact = false,
  className = ''
}) => {
  const copy = getBroadcastCopy();

  // ============================================================================
  // State 1: NOT JOINED - Show "Join Video" button
  // ============================================================================
  if (!isVideoEnabled && !isVideoPrepairing) {
    return (
      <div className={`video-control-cluster ${className}`}>
        <button
          onClick={onPrepareVideo}
          className="video-join-btn"
          title={copy.controls.joinVideoChat}
        >
          <Video className="w-4 h-4" />
          <span className="video-join-text">{copy.controls.joinVideo}</span>
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
          <span>{copy.controls.settingUp}</span>
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
          title={isFilmstripExpanded ? copy.controls.collapseVideos : copy.controls.expandVideos}
        >
          {isFilmstripExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          {!compact && <span>{copy.controls.videos}</span>}
        </button>
      )}

      {/* Video Toggle (Camera On/Off) */}
      {onToggleVideo && (
        <button
          onClick={onToggleVideo}
          className={`video-control-btn ${!isCameraEnabled ? 'off' : ''}`}
          title={isCameraEnabled ? copy.controls.turnOffCamera : copy.controls.turnOnCamera}
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
          title={isAudioEnabled ? copy.controls.muteMicrophone : copy.controls.unmuteMicrophone}
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
          title={copy.controls.videoSettings}
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* Leave Video */}
      {onDisableVideo && (
        <button
          onClick={onDisableVideo}
          className="video-control-btn leave"
          title={copy.controls.leaveVideoChat}
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      )}

      {/* Broadcast (OBS capture window) */}
      {onOpenBroadcast && (
        <button
          onClick={onOpenBroadcast}
          className="video-control-btn"
          title={copy.controls.openBroadcastWindow}
        >
          <Radio className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default VideoControlCluster;
