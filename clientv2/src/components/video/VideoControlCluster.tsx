/**
 * Video Control Cluster
 *
 * Three-state video controls:
 * 1. NOT JOINED: Shows "Join Video" button
 * 2. PREPARING: Shows "Setting up..." badge with pulse
 * 3. ACTIVE: Shows full controls (filmstrip, mic, camera, leave, broadcast)
 */

import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Settings,
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Smile
} from 'lucide-react';
import { getBroadcastCopy } from './broadcastCopy';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { t } from '../../utils/translations';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '👏'];

interface VideoControlClusterProps {
  isVideoEnabled?: boolean;
  isVideoPrepairing?: boolean;
  onPrepareVideo?: () => void;
  onDisableVideo?: () => void;

  isFilmstripExpanded?: boolean;
  onToggleFilmstrip?: () => void;
  onOpenSettings?: () => void;
  onOpenBroadcast?: () => void;
  isCameraEnabled?: boolean;
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
  const { sendReaction, isPushToTalkActive } = useWebRTC();
  const [reactionsOpen, setReactionsOpen] = useState(false);

  if (!isVideoEnabled && !isVideoPrepairing) {
    return (
      <div className={`video-control-cluster ${className}`}>
        <button
          onClick={onPrepareVideo}
          className="video-join-btn"
          title={t('video.joinVideo')}
        >
          <Video className="w-4 h-4" />
          <span className="video-join-text">{t('video.joinVideo')}</span>
        </button>
      </div>
    );
  }

  if (isVideoPrepairing) {
    return (
      <div className={`video-control-cluster ${className}`}>
        <div className="video-preparing-badge">
          <Video className="w-4 h-4" />
          <span>{t('video.settingUp')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`video-control-cluster ${compact ? 'compact' : ''} ${className}`}>
      {/* Filmstrip Toggle */}
      {onToggleFilmstrip && (
        <button
          onClick={onToggleFilmstrip}
          className="video-control-btn"
          title={isFilmstripExpanded ? t('videoControl.collapseVideos') : t('videoControl.expandVideos')}
        >
          {isFilmstripExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          {!compact && <span>{t('videoControl.videosLabel')}</span>}
        </button>
      )}

      {/* Video Toggle */}
      {onToggleVideo && (
        <button
          onClick={onToggleVideo}
          className={`video-control-btn ${!isCameraEnabled ? 'off' : ''}`}
          title={isCameraEnabled ? t('videoControl.cameraOff') : t('videoControl.cameraOn')}
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
          title={isAudioEnabled ? t('videoControl.muteMic') : t('videoControl.unmuteMic')}
        >
          {isAudioEnabled ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Push-to-talk live indicator */}
      {isPushToTalkActive && (
        <span className="video-ptt-indicator" title={t('videoControl.pttLive')}>
          <Mic className="w-4 h-4" />
          {!compact && <span>{t('videoControl.pttLive')}</span>}
        </span>
      )}

      {/* Reactions */}
      <div className="video-reactions-wrap">
        <button
          onClick={() => setReactionsOpen(o => !o)}
          className={`video-control-btn ${reactionsOpen ? 'active' : ''}`}
          title={t('videoControl.reactions')}
          aria-haspopup="true"
          aria-expanded={reactionsOpen}
        >
          <Smile className="w-4 h-4" />
        </button>
        {reactionsOpen && (
          <div className="video-reactions-popover" role="menu">
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="video-reaction-emoji"
                onClick={() => { sendReaction(emoji); setReactionsOpen(false); }}
                aria-label={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="video-control-btn"
          title={t('videoControl.videoSettings')}
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* Leave Video */}
      {onDisableVideo && (
        <button
          onClick={onDisableVideo}
          className="video-control-btn leave"
          title={t('video.leaveVideo')}
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
