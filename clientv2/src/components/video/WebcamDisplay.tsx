/**
 * Webcam Display
 *
 * Displays a single video stream with player info overlay.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MicOff, Crown, Volume2, VolumeX } from 'lucide-react';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { t } from '../../utils/translations';

interface WebcamDisplayProps {
  player: WebcamPlayer;
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isHost?: boolean;
  isTurn?: boolean;
  isSpeaking?: boolean;
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
  isSpeaking = false,
  showName = true,
  size = 'medium',
  className = '',
  style,
  teamColor
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Per-peer "tabbed out" state, broadcast from the sender via the
  // simple-peer data channel. When true we render the avatar placeholder
  // with an "Away" label instead of the (otherwise black) video frames.
  const {
    peerHiddenMap, connectingPeers, peerQuality,
    peerReactions, peerVolume, locallyMutedPeers, setPeerVolume, toggleLocalMute,
  } = useWebRTC();
  const isPeerAway = !isLocal && peerHiddenMap.get(player.id) === true;
  // Remote peer is mid-negotiation: we know about them but their stream
  // hasn't arrived yet. Drives the "connecting…" spinner in the placeholder.
  const isConnecting = !isLocal && connectingPeers.has(player.id);
  // Inbound connection quality for this remote peer (from getStats polling).
  const quality = !isLocal ? peerQuality.get(player.id) : undefined;
  // Floating reaction ('local' key for self).
  const reaction = peerReactions.get(isLocal ? 'local' : player.id);
  // Per-peer local audio (remote tiles only).
  const isLocallyMuted = !isLocal && locallyMutedPeers.has(player.id);
  const localVolume = !isLocal ? (peerVolume.get(player.id) ?? 1) : 1;

  // Deterministic per-player gradient for the camera-off / connecting avatar,
  // so tiles are visually distinct instead of all sharing one brand gradient.
  const avatarGradient = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < player.name.length; i++) {
      hash = (hash * 31 + player.name.charCodeAt(i)) % 360;
    }
    const hue = ((hash % 360) + 360) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 62%, 55%), hsl(${(hue + 45) % 360}, 62%, 42%))`;
  }, [player.name]);

  // Track whether the remote sender is currently producing frames. When a
  // peer tabs out / minimises, their browser pauses the outgoing video and
  // our local track fires `mute`. Without this, the <video> element holds
  // a frozen last frame (which often renders black). Showing the avatar
  // placeholder instead is more legible.
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(() => {
    if (isLocal) return false;
    const t = stream?.getVideoTracks()[0];
    return t ? t.muted : false;
  });

  useEffect(() => {
    if (isLocal || !stream) {
      setIsVideoMuted(false);
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setIsVideoMuted(true);
      return;
    }
    setIsVideoMuted(track.muted);
    const onMute = () => {
      console.log(`[Video/track] remote video muted | peer=${player.name} id=${track.id.slice(0,8)}`);
      setIsVideoMuted(true);
    };
    const onUnmute = () => {
      console.log(`[Video/track] remote video unmuted | peer=${player.name} id=${track.id.slice(0,8)}`);
      setIsVideoMuted(false);
    };
    const onEnded = () => setIsVideoMuted(true);
    track.addEventListener('mute', onMute);
    track.addEventListener('unmute', onUnmute);
    track.addEventListener('ended', onEnded);
    return () => {
      track.removeEventListener('mute', onMute);
      track.removeEventListener('unmute', onUnmute);
      track.removeEventListener('ended', onEnded);
    };
  }, [stream, isLocal, player.name]);

  // Compute hasVideo before the attach effect so it can be a dependency.
  // When the track starts as muted (typical for a brand new peer), the
  // <video> element doesn't render until unmute flips hasVideo true. The
  // attach effect must re-run at that moment to set srcObject, otherwise
  // the element mounts with an empty source and the user sees nothing.
  const videoTrack = stream?.getVideoTracks()[0];
  // We keep showing the live video even when the peer is tabbed out —
  // Chrome doesn't throttle WebRTC pipelines, so frames keep flowing.
  // The "Away" status surfaces as a small badge overlay (rendered below)
  // rather than hiding the video.
  const hasVideo = !!videoTrack && videoTrack.enabled && !isVideoMuted;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;

    // Audio is owned by the dedicated RemoteAudioSinks element, so the video
    // tile is always muted to avoid double playback.
    el.muted = true;

    // Idempotent attach: only set srcObject when it actually changed. The old
    // implementation always did srcObject=null → wait 50ms → reattach (plus a
    // cleanup that nulled srcObject on every re-run), which blanked the <video>
    // for ~50ms — a visible camera flash whenever the tile re-rendered for any
    // reason (speaking ring, quality poll, reactions, …). Attaching only on a
    // genuine stream change removes the flash entirely.
    if (el.srcObject === stream) return;

    el.srcObject = stream;
    el.play().catch(err => {
      console.log(`[WebcamDisplay] Autoplay prevented for ${player.name}:`, err);
    });
  }, [stream, player.name, hasVideo]);

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
      className={`webcam-display ${size} ${isTurn ? 'is-turn' : ''} ${isSpeaking ? 'is-speaking' : ''} ${teamColor ? 'has-team' : ''} ${className}`}
      style={combinedStyle}
    >
      {/* Active-speaker ring — a dedicated opacity-animated overlay (NOT a
          box-shadow/animation on the tile itself, which would collide with the
          filmstrip's videoFeedEnter entrance animation and make the tile blink). */}
      <div className={`webcam-speaking-ring${isSpeaking ? ' active' : ''}`} aria-hidden="true" />

      {/* Video Element */}
      <div className="webcam-video-container">
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="webcam-video"
          />
        ) : (
          <div className="webcam-placeholder">
            <div
              className="webcam-avatar"
              style={player.avatarUrl ? undefined : { background: avatarGradient }}
            >
              {player.avatarUrl ? (
                <img src={player.avatarUrl as string} alt="" className="webcam-avatar-img" />
              ) : (
                <span className="webcam-avatar-initial">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isConnecting && (
              <div className="webcam-connecting" role="status">
                <span className="webcam-connecting-spinner" aria-hidden="true" />
                <span className="webcam-connecting-label">{t('videoControl.connecting')}</span>
              </div>
            )}
          </div>
        )}

        {/* "Away" badge — shown over the live video when the peer's
            document.hidden flips true. Streaming continues; this is just
            a visual hint that the peer's attention is elsewhere. */}
        {isPeerAway && (
          <span className="webcam-away-badge">Away</span>
        )}

        {/* Local indicator (mirrored video) */}
        {isLocal && hasVideo && (
          <div className="webcam-local-indicator">You</div>
        )}

        {/* Connection-quality signal bars (remote peers only) */}
        {!isLocal && quality && (
          <div
            className={`webcam-quality is-${quality}`}
            title={`Connection: ${quality}`}
            aria-label={`Connection quality: ${quality}`}
          >
            <span className="q-bar q1" />
            <span className="q-bar q2" />
            <span className="q-bar q3" />
          </div>
        )}

        {/* Per-peer local audio control (remote tiles): mute-for-me + volume */}
        {!isLocal && (
          <div className={`webcam-audio-control ${isLocallyMuted ? 'is-muted' : ''}`}>
            <button
              type="button"
              className={`webcam-audio-btn ${isLocallyMuted ? 'muted' : ''}`}
              onClick={() => toggleLocalMute(player.id)}
              title={isLocallyMuted ? 'Unmute for me' : 'Mute for me'}
              aria-label={isLocallyMuted ? 'Unmute this person for me' : 'Mute this person for me'}
            >
              {isLocallyMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            <input
              className="webcam-volume-slider"
              type="range"
              min="0"
              max="100"
              value={Math.round(localVolume * 100)}
              onChange={e => setPeerVolume(player.id, parseInt(e.target.value, 10) / 100)}
              aria-label="Volume for this person"
              disabled={isLocallyMuted}
            />
          </div>
        )}

        {/* Floating reaction emoji */}
        {reaction && (
          <div key={reaction.key} className="webcam-reaction">{reaction.emoji}</div>
        )}
      </div>

      {/* Overlay Info */}
      <div className="webcam-overlay">
        {/* Name */}
        {showName && (
          <div className="webcam-name">
            {isHost && <Crown className="w-3 h-3 webcam-host-icon" />}
            <span>{player.name}</span>
            {isLocal && <span className="webcam-you-tag">(You)</span>}
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
          <span>{t('videoControl.yourTurn')}</span>
        </div>
      )}
    </div>
  );
};

export default WebcamDisplay;
