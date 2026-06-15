/**
 * Streamer Webcam Grid
 *
 * Equal-size grid of all webcam feeds.
 * Used in Grid layout. Falls back to thin strip during reveal.
 * Each tile has a right-edge resize handle — drag right to make all tiles bigger.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useWebRTC } from '../../contexts/WebRTCContext';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import type { BroadcastOverlays } from './StreamerSettingsPanel';
import { t } from '../../utils/translations';

const LS_TILE_SIZE_KEY = 'gb-broadcast-grid-tile-size';
const DEFAULT_TILE_SIZE = 180;

interface StreamerWebcamGridProps {
  players: WebcamPlayer[];
  localPlayerName?: string;
  mySocketId?: string;
  overlays: BroadcastOverlays;
  strip?: boolean; // Compact strip mode for reveal phase
  height?: number; // Optional explicit height (resizable grid mode)
}

const StreamerWebcamGrid: React.FC<StreamerWebcamGridProps> = ({
  players,
  localPlayerName,
  mySocketId: _mySocketId,
  overlays,
  strip = false,
  height
}) => {
  const { localStream, remoteStreams, speakingPeers, isLocalSpeaking } = useWebRTC();
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const [tileSize, setTileSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LS_TILE_SIZE_KEY);
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n)) return Math.max(0, n);
      }
    } catch { /* ignore */ }
    return DEFAULT_TILE_SIZE;
  });
  const tileSizeRef = useRef(tileSize);
  useEffect(() => { tileSizeRef.current = tileSize; }, [tileSize]);

  // Drag right = bigger tiles (X-axis, consistent with strip inter-tile handles)
  const handleTileResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    const doc = handle.ownerDocument;
    handle.classList.add('dragging');

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startSize = tileSizeRef.current;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent
        ? (moveEvent as TouchEvent).touches[0].clientX
        : (moveEvent as MouseEvent).clientX;
      // Drag right = bigger tiles
      const delta = currentX - startX;
      setTileSize(Math.max(0, Math.min(9999, startSize + delta)));
    };

    const handleEnd = () => {
      handle.classList.remove('dragging');
      localStorage.setItem(LS_TILE_SIZE_KEY, tileSizeRef.current.toString());
      doc.removeEventListener('mousemove', handleMove);
      doc.removeEventListener('mouseup', handleEnd);
      doc.removeEventListener('touchmove', handleMove);
      doc.removeEventListener('touchend', handleEnd);
    };

    doc.addEventListener('mousemove', handleMove);
    doc.addEventListener('mouseup', handleEnd);
    doc.addEventListener('touchmove', handleMove);
    doc.addEventListener('touchend', handleEnd);
  }, []);

  const playersWithStreams = players.filter(p => remoteStreams.has(p.id));
  const totalCount = playersWithStreams.length + (localStream ? 1 : 0);

  // Attach streams to video elements
  useEffect(() => {
    videoRefs.current.forEach((videoEl, id) => {
      if (id === 'local' && localStream) {
        if (videoEl.srcObject !== localStream) {
          videoEl.srcObject = localStream;
          videoEl.play().catch(() => {});
        }
      } else {
        const stream = remoteStreams.get(id);
        if (stream && videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          videoEl.play().catch(() => {});
        }
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

  const renderTile = (id: string, name: string, isLocal: boolean) => {
    const stream = isLocal ? localStream : remoteStreams.get(id);
    const hasVideo = stream?.getVideoTracks().some(t => t.enabled);
    const isSpeaking = isLocal ? isLocalSpeaking : speakingPeers.has(id);

    return (
      <div
        key={id}
        className={`sb-webcam-tile ${isLocal ? 'local' : ''} ${isSpeaking ? 'is-speaking' : ''}`}
        style={!strip ? { width: `${tileSize}px`, height: `${tileSize}px`, flexShrink: 0 } : undefined}
      >
        {/* Always render video so ref fires and stream attaches */}
        <div className="sb-tile-inner">
          <video
            ref={el => {
              if (el) videoRefs.current.set(id, el);
              else videoRefs.current.delete(id);
            }}
            autoPlay
            playsInline
            muted
            className={isLocal ? 'mirrored' : ''}
          />
          {!hasVideo && (
            <div className="sb-no-video-overlay">
              <span>{name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        {overlays.playerNames && (
          <div className="sb-webcam-name">
            {name}
            {isLocal && <span className="sb-you-tag"> (You)</span>}
          </div>
        )}
        {/* Right-edge resize handle — drag right to make all tiles bigger */}
        {!strip && (
          <div
            className="sb-inter-tile-handle-v"
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0 }}
            onMouseDown={handleTileResizeStart}
            onTouchStart={handleTileResizeStart}
            title={t('streamerStage.resizeTiles')}
          />
        )}
      </div>
    );
  };

  // Non-strip: flex-wrap so tiles have explicit pixel sizes and wrap naturally.
  // Strip: keep CSS grid for the compact reveal mode.
  const gridStyle: React.CSSProperties = strip
    ? (height !== undefined ? { height: `${height}px`, flexShrink: 0 } : {})
    : {
        height: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        overflowY: 'auto',
      };

  return (
    <div style={{ position: 'relative', ...(height !== undefined ? { flexShrink: 0, height: `${height}px` } : { flex: 1, minHeight: 0 }) }}>
      <div
        className={`streamer-webcam-grid ${strip ? 'strip-mode' : ''} ${strip ? getGridClass() : ''}`}
        style={gridStyle}
      >
        {localStream && renderTile('local', localPlayerName || 'You', true)}
        {playersWithStreams.map(p => renderTile(p.id, p.name, false))}
      </div>
    </div>
  );
};

export default StreamerWebcamGrid;
