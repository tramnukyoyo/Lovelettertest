/**
 * Webcam Display
 *
 * Displays a single video stream with player info overlay.
 */

import React, { useRef, useEffect } from 'react';
import { MicOff, Crown } from 'lucide-react';
import type { WebcamPlayer } from './adapters';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

interface WebcamDisplayProps {
  player: WebcamPlayer;
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isHost?: boolean;
  isTurn?: boolean;
  showName?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
  teamColor?: string;
}

const WebcamDisplay: React.FC<WebcamDisplayProps> = ({
  player,
  stream,
  isLocal = false,
  isMuted = false,
  isHost = false,
  isTurn = false,
  showName = true,
  size = 'medium',
  className = '',
  style,
  teamColor
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachAttempts = useRef(0);
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);

  useEffect(() => {
    const attachStream = async () => {
      if (videoRef.current && stream) {
        try {
          // Detach any existing stream
          if (videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
          }

          // Force a small delay to ensure proper re-attachment
          await new Promise(resolve => setTimeout(resolve, 50));

          // Attach the new stream
          videoRef.current.srcObject = stream;

          // Ensure video plays
          await videoRef.current.play().catch(err => {
            console.log(`[WebcamDisplay] Autoplay prevented for ${player.name}:`, err);
          });

          attachAttempts.current = 0;
          console.log(`[WebcamDisplay] Stream attached for ${player.name}`);
        } catch (err) {
          console.error(`[WebcamDisplay] Error attaching stream for ${player.name}:`, err);

          // Retry attachment up to 3 times with exponential backoff
          if (attachAttempts.current < 3) {
            attachAttempts.current++;
            console.log(`[WebcamDisplay] Retrying attachment for ${player.name} (attempt ${attachAttempts.current})`);
            setTimeout(() => attachStream(), 500 * attachAttempts.current);
          }
        }
      }
    };

    attachStream();

    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, player.name]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;

  // Merge team color styles with passed styles
  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(teamColor ? {
      borderColor: teamColor,
      borderWidth: '3px',
      borderStyle: 'solid',
      boxShadow: `0 0 12px ${teamColor}40`
    } : {})
  };

  return (
    <div
      className={`webcam-display ${size} ${isTurn ? 'is-turn' : ''} ${teamColor ? 'has-team' : ''} ${className}`}
      style={combinedStyle}
    >
      {/* Video Element */}
      <div className="webcam-video-container">
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="webcam-video"
          />
        ) : (
          <div className="webcam-placeholder">
            <div className="webcam-avatar">
              {player.avatarUrl ? (
                <img src={player.avatarUrl as string} alt="" className="webcam-avatar-img" />
              ) : (
                <span className="webcam-avatar-initial">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Local indicator (mirrored video) */}
        {isLocal && hasVideo && (
          <div className="webcam-local-indicator">{t('video.localIndicator')}</div>
        )}
      </div>

      {/* Overlay Info */}
      <div className="webcam-overlay">
        {/* Name */}
        {showName && (
          <div className="webcam-name">
            {isHost && <Crown className="w-3 h-3 webcam-host-icon" />}
            <span>{player.name}</span>
            {isLocal && <span className="webcam-you-tag">{t('video.youTag')}</span>}
          </div>
        )}

        {/* Mute indicator */}
        {isMuted && (
          <div className="webcam-muted">
            <MicOff className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Turn indicator */}
      {isTurn && (
        <div className="webcam-turn-indicator">
          <span>{t('video.yourTurn')}</span>
        </div>
      )}
    </div>
  );
};

export default WebcamDisplay;
