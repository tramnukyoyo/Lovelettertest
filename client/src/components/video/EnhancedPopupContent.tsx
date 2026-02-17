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
import { useWebRTC } from './adapters';

// Raw SVG icons for popout window — React createPortal doesn't render
// SVG elements correctly in cross-document contexts
const POPOUT_ICONS = {
  mic: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>',
  micOff: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>',
  video: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
  videoOff: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
  phoneOff: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  grid: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  maximize: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>',
  videoOffLg: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
  videoOffXl: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
};

const PopoutIcon = ({ name }: { name: keyof typeof POPOUT_ICONS }) => (
  <span dangerouslySetInnerHTML={{ __html: POPOUT_ICONS[name] }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
);
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
            <PopoutIcon name="videoOffLg" />
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
              <PopoutIcon name="grid" />
            </button>
            <button
              className={`popup-layout-btn ${layoutMode === 'speaker' ? 'active' : ''}`}
              onClick={() => setLayoutMode('speaker')}
              title="Speaker View"
            >
              <PopoutIcon name="users" />
            </button>
            <button
              className={`popup-layout-btn ${layoutMode === 'spotlight' ? 'active' : ''}`}
              onClick={() => {
                setLayoutMode('spotlight');
                setSpotlightId(null);
              }}
              title="Spotlight View"
            >
              <PopoutIcon name="maximize" />
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
              {isAudioEnabled ? <PopoutIcon name="mic" /> : <PopoutIcon name="micOff" />}
            </button>
            <button
              className={`popup-control-btn ${!isVideoEnabled ? 'off' : ''}`}
              onClick={toggleVideo}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <PopoutIcon name="video" /> : <PopoutIcon name="videoOff" />}
            </button>
            <button
              className="popup-control-btn leave"
              onClick={handleLeave}
              title="Leave video chat"
            >
              <PopoutIcon name="phoneOff" />
            </button>
          </div>

          <button className="popup-close-btn" onClick={onClose} title="Close popup">
            <PopoutIcon name="x" />
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
                  <PopoutIcon name="videoOffXl" />
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
