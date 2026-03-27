/**
 * Streamer Webcam Grid — Prime Suspect
 *
 * Responsive grid of webcam feeds following Canvas Chaos's simplified pattern.
 * No resize handles — uses CSS grid classes for automatic layout.
 * Shows placeholder tiles for players without video.
 */

import React, { useRef, useEffect } from 'react';
import { VideoOff } from 'lucide-react';
import { useWebRTC } from '../../contexts/WebRTCContext';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import type { BroadcastOverlays } from './StreamerSettingsPanel';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

interface StreamerWebcamGridProps {
  players: WebcamPlayer[];
  localPlayerName?: string;
  mySocketId?: string;
  overlays: BroadcastOverlays;
  layout?: 'grid' | 'sidebar';
  strip?: boolean;
  height?: number;
}

const StreamerWebcamGrid: React.FC<StreamerWebcamGridProps> = ({
  players,
  localPlayerName,
  mySocketId,
  overlays,
  layout = 'grid',
  strip = false,
  height,
}) => {
  const { localStream, remoteStreams } = useWebRTC();
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const localPlayer: WebcamPlayer | null = (localPlayerName || mySocketId)
    ? { id: mySocketId || 'local', name: localPlayerName || 'You' }
    : null;
  const remotePlayers = players.filter(player => {
    if (mySocketId && player.id === mySocketId) return false;
    if (!mySocketId && localPlayerName && player.name === localPlayerName) return false;
    return true;
  });

  const tilePlayers: Array<{ player: WebcamPlayer; isLocal: boolean; streamId: string }> = [
    ...(localPlayer ? [{ player: localPlayer, isLocal: true, streamId: 'local' }] : []),
    ...remotePlayers.map(player => ({ player, isLocal: false, streamId: player.id })),
  ];

  const totalCount = tilePlayers.length;

  useEffect(() => {
    videoRefs.current.forEach((videoEl, id) => {
      const stream = id === 'local' ? localStream : remoteStreams.get(id);

      if (stream) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          videoEl.play().catch(() => {});
        }
      } else if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
    });
  }, [localStream, remoteStreams]);

  const getGridClass = () => {
    if (totalCount <= 1) return 'sb-grid-1';
    if (totalCount <= 2) return 'sb-grid-2';
    if (totalCount <= 4) return 'sb-grid-4';
    if (totalCount <= 6) return 'sb-grid-6';
    return 'sb-grid-9';
  };

  const renderPlaceholder = () => (
    <div className="sb-no-video-overlay">
      <img src={`${import.meta.env.BASE_URL}videoplaceholder.webp`} alt="" className="sb-no-video-bg" />
      <VideoOff className="sb-no-video-icon" />
    </div>
  );

  const renderTile = ({ player, isLocal, streamId }: { player: WebcamPlayer; isLocal: boolean; streamId: string }) => {
    const stream = isLocal ? localStream : remoteStreams.get(player.id);
    const hasVideo = Boolean(stream?.getVideoTracks().some(track => track.enabled));

    return (
      <div
        key={streamId}
        className={`sb-webcam-tile ${isLocal ? 'local' : ''} ${hasVideo ? 'has-video' : 'no-video'}`}
      >
        <div className={`sb-webcam-media ${hasVideo ? 'has-video' : 'is-placeholder'}`}>
          <div className="sb-tile-inner">
            <video
              ref={element => {
                if (element) videoRefs.current.set(streamId, element);
                else videoRefs.current.delete(streamId);
              }}
              autoPlay
              playsInline
              muted
              className={isLocal ? 'mirrored' : ''}
            />
            {!hasVideo && renderPlaceholder()}
          </div>
        </div>

        {overlays.playerNames && (
          <div className="sb-webcam-namebar">
            <div className="sb-webcam-name">
              {player.name}
              {isLocal && <span className="sb-you-tag"> {getTranslation('video.youTag' as any, getCurrentLanguage())}</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const gridStyle: React.CSSProperties = strip
    ? (height !== undefined ? { height: `${height}px`, flexShrink: 0 } : {})
    : (height !== undefined ? { height: `${height}px` } : {});

  return (
    <div style={{ position: 'relative', ...(height !== undefined ? { flexShrink: 0, height: `${height}px` } : { flex: 1, minHeight: 0 }) }}>
      <div
        className={`streamer-webcam-grid responsive-grid ${layout === 'sidebar' ? 'sidebar-stack' : ''} ${strip ? 'strip-mode' : ''} ${getGridClass()}`}
        style={gridStyle}
      >
        {tilePlayers.map(renderTile)}
      </div>
    </div>
  );
};

export default StreamerWebcamGrid;
