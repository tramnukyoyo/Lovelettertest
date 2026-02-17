/**
 * Enhanced Popup Content
 *
 * Content for the video popout window.
 * Features:
 * - Grid View: All participants in responsive grid
 * - Speaker View: One large + filmstrip
 * - Spotlight View: Click any participant to enlarge
 * - Video controls (mic, camera, leave)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Grid3X3,
  Users,
  Maximize2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  X
} from 'lucide-react';
import { useWebRTC } from './adapters';
import { GAME_META } from './adapters';
import type { Team } from './adapters';

type LayoutMode = 'grid' | 'speaker' | 'spotlight';

interface EnhancedPopupContentProps {
  roomCode: string;
  players: Array<{ id: string; name: string; avatarUrl?: string }>;
  localPlayerName?: string;
  onClose: () => void;
  teams?: Team[];
  mySocketId?: string;
}

const EnhancedPopupContent: React.FC<EnhancedPopupContentProps> = ({
  roomCode,
  players,
  localPlayerName,
  onClose,
  teams = [],
  mySocketId
}) => {
  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    disableVideoChat
  } = useWebRTC();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Use provided name or fallback to 'You'
  const localName = localPlayerName || 'You';

  // Helper to get player's team color
  const getPlayerTeamColor = (playerId: string): string | undefined => {
    for (const team of teams) {
      if (team.playerIds.includes(playerId)) {
        return team.color;
      }
    }
    return undefined;
  };

  // Helper to sort players by team (Team Red first, then Team Blue, etc.)
  const sortPlayersByTeam = <T extends { id: string }>(playerList: T[]): T[] => {
    if (teams.length === 0) return playerList;
    return [...playerList].sort((a, b) => {
      const teamA = teams.findIndex(t => t.playerIds.includes(a.id));
      const teamB = teams.findIndex(t => t.playerIds.includes(b.id));
      // Players without team go last
      if (teamA === -1 && teamB === -1) return 0;
      if (teamA === -1) return 1;
      if (teamB === -1) return -1;
      return teamA - teamB;
    });
  };

  // Filter to only players who have active video streams, sorted by team
  const playersWithStreams = sortPlayersByTeam(players.filter(p => remoteStreams.has(p.id)));

  // Debug logging
  console.log('[EnhancedPopupContent] Render - remoteStreams size:', remoteStreams.size);
  console.log('[EnhancedPopupContent] remoteStreams keys:', Array.from(remoteStreams.keys()));
  console.log('[EnhancedPopupContent] players:', players.map(p => p.id));
  console.log('[EnhancedPopupContent] playersWithStreams:', playersWithStreams.map(p => p.id));

  // Mount logging
  useEffect(() => {
    console.log('[EnhancedPopupContent] Mounted. Players:', players.length,
      'remoteStreams:', remoteStreams.size, 'localStream:', !!localStream);
  }, []);

  // Attach streams to video elements
  useEffect(() => {
    console.log('[EnhancedPopupContent] useEffect - attaching streams, videoRefs count:', videoRefs.current.size);
    videoRefs.current.forEach((videoEl, id) => {
      console.log('[EnhancedPopupContent] Processing video ref:', id);
      if (id === 'local' && localStream) {
        if (videoEl.srcObject !== localStream) {
          console.log('[EnhancedPopupContent] Attaching local stream');
          videoEl.srcObject = localStream;
          // Explicit play() for popup window context - autoplay may be blocked
          videoEl.play().catch(err => {
            console.warn('[EnhancedPopupContent] Autoplay blocked for local:', err);
          });
        }
      } else {
        const stream = remoteStreams.get(id);
        if (stream && videoEl.srcObject !== stream) {
          console.log('[EnhancedPopupContent] Attaching remote stream for:', id);
          videoEl.srcObject = stream;
          // Explicit play() for popup window context - autoplay may be blocked
          videoEl.play().catch(err => {
            console.warn('[EnhancedPopupContent] Autoplay blocked for', id, ':', err);
          });
        } else if (!stream) {
          console.log('[EnhancedPopupContent] No stream found for:', id);
        }
      }
    });
  }, [localStream, remoteStreams]);

  const handleLeave = () => {
    disableVideoChat();
    onClose();
  };

  const handleSpotlight = (id: string) => {
    if (layoutMode === 'spotlight') {
      setSpotlightId(spotlightId === id ? null : id);
    }
  };

  // Get grid class based on participant count
  const getGridClass = () => {
    const count = playersWithStreams.length + (localStream ? 1 : 0);
    if (count <= 1) return 'grid-1x1';
    if (count <= 2) return 'grid-1x2';
    if (count <= 4) return 'grid-2x2';
    if (count <= 6) return 'grid-2x3';
    if (count <= 9) return 'grid-3x3';
    return 'grid-4x4';
  };

  // Render a single video tile
  const renderVideoTile = (id: string, name: string, isLocal: boolean, isLarge: boolean = false) => {
    const stream = isLocal ? localStream : remoteStreams.get(id);
    const hasVideo = stream?.getVideoTracks().some(t => t.enabled);
    // Get team color for this player
    const playerId = isLocal && mySocketId ? mySocketId : id;
    const teamColor = getPlayerTeamColor(playerId);

    const tileStyle: React.CSSProperties = teamColor ? {
      borderColor: teamColor,
      borderWidth: '3px',
      borderStyle: 'solid',
      boxShadow: `0 0 12px ${teamColor}40`
    } : {};

    return (
      <div
        key={id}
        className={`popup-video-tile ${isLarge ? 'large' : ''} ${isLocal ? 'local' : ''} ${teamColor ? 'has-team' : ''}`}
        onClick={() => handleSpotlight(id)}
        style={tileStyle}
      >
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
          <div className="popup-video-placeholder">
            <VideoOff className="w-8 h-8" />
          </div>
        )}
        <div className="popup-video-label">
          <span>{name}</span>
          {isLocal && <span className="you-badge">(You)</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-popup-content">
      {/* Header */}
      <header className="popup-header">
        <div className="popup-header-left">
          <img
            src={`${import.meta.env.BASE_URL}mascot.webp`}
            alt={GAME_META.mascotAlt}
            className="popup-logo"
          />
          <div className="popup-title">
            <span className="popup-game-name">
              {GAME_META.namePrefix}<span className="accent">{GAME_META.nameAccent}</span>
            </span>
            <span className="popup-room-info">
              Room: {roomCode} | {playersWithStreams.length + (localStream ? 1 : 0)} connected
            </span>
          </div>
        </div>

        <div className="popup-header-center">
          {/* Layout Mode Selector */}
          <div className="popup-layout-selector">
            <button
              className={`popup-layout-btn ${layoutMode === 'grid' ? 'active' : ''}`}
              onClick={() => setLayoutMode('grid')}
              title="Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              className={`popup-layout-btn ${layoutMode === 'speaker' ? 'active' : ''}`}
              onClick={() => setLayoutMode('speaker')}
              title="Speaker View"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              className={`popup-layout-btn ${layoutMode === 'spotlight' ? 'active' : ''}`}
              onClick={() => {
                setLayoutMode('spotlight');
                setSpotlightId(null);
              }}
              title="Spotlight View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="popup-header-right">
          {/* Video Controls */}
          <div className="popup-controls">
            <button
              className={`popup-control-btn ${!isAudioEnabled ? 'off' : ''}`}
              onClick={toggleAudio}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              className={`popup-control-btn ${!isVideoEnabled ? 'off' : ''}`}
              onClick={toggleVideo}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button
              className="popup-control-btn leave"
              onClick={handleLeave}
              title="Leave video chat"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>

          <button className="popup-close-btn" onClick={onClose} title="Close popup">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Video Grid */}
      <main className="popup-video-container">
        {layoutMode === 'grid' && (
          <div className={`popup-grid ${getGridClass()}`}>
            {/* Local video first */}
            {localStream && renderVideoTile('local', localName, true)}
            {/* Remote videos - only show players with active streams */}
            {playersWithStreams.map(p => renderVideoTile(p.id, p.name, false))}
          </div>
        )}

        {layoutMode === 'speaker' && (
          <div className="popup-speaker-layout">
            {/* Main speaker (first remote or local) */}
            <div className="popup-speaker-main">
              {playersWithStreams.length > 0 ? (
                renderVideoTile(playersWithStreams[0].id, playersWithStreams[0].name, false, true)
              ) : localStream ? (
                renderVideoTile('local', localName, true, true)
              ) : (
                <div className="popup-video-placeholder">
                  <VideoOff className="w-12 h-12" />
                  <span>No video</span>
                </div>
              )}
            </div>
            {/* Filmstrip of others */}
            <div className="popup-speaker-filmstrip">
              {localStream && playersWithStreams.length > 0 && renderVideoTile('local', localName, true)}
              {playersWithStreams.slice(1).map(p => renderVideoTile(p.id, p.name, false))}
            </div>
          </div>
        )}

        {layoutMode === 'spotlight' && (
          <div className="popup-spotlight-layout">
            {spotlightId ? (
              <>
                {/* Spotlighted video */}
                <div className="popup-spotlight-main">
                  {spotlightId === 'local' ? (
                    renderVideoTile('local', localName, true, true)
                  ) : (
                    renderVideoTile(
                      spotlightId,
                      playersWithStreams.find(p => p.id === spotlightId)?.name || 'Unknown',
                      false,
                      true
                    )
                  )}
                </div>
                {/* Others in filmstrip */}
                <div className="popup-spotlight-filmstrip">
                  {localStream && spotlightId !== 'local' && renderVideoTile('local', localName, true)}
                  {playersWithStreams.filter(p => p.id !== spotlightId).map(p => renderVideoTile(p.id, p.name, false))}
                </div>
              </>
            ) : (
              <div className={`popup-grid ${getGridClass()}`}>
                {/* Show grid when nothing spotlighted, click to spotlight */}
                {localStream && renderVideoTile('local', localName, true)}
                {playersWithStreams.map(p => renderVideoTile(p.id, p.name, false))}
                <div className="popup-spotlight-hint">
                  Click any video to spotlight
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer with branding */}
      <footer className="popup-footer">
        <div className="popup-branding">
          <img
            src={`${import.meta.env.BASE_URL}mascot.webp`}
            alt=""
            className="popup-branding-mascot"
          />
          <span className="brand-prefix">{GAME_META.namePrefix}</span>
          <span className="brand-accent">{GAME_META.nameAccent}</span>
          <span className="brand-by"> by </span>
          <span className="brand-game">Game</span>
          <span className="brand-buddies">Buddies</span>
          <span className="brand-io">.io</span>
        </div>
      </footer>
    </div>
  );
};

export default EnhancedPopupContent;
