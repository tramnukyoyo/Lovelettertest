/**
 * Mobile Video Grid
 *
 * Grid layout for video feeds on mobile devices.
 * Optimized for portrait and landscape orientations.
 */

import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useWebRTC } from '../../contexts/WebRTCContext';
import WebcamDisplay from './WebcamDisplay';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import type { Team } from '../../types';
import { t } from '../../utils/translations';

interface MobileVideoGridProps {
  players: WebcamPlayer[];
  localPlayerName?: string;
  currentTurnPlayerId?: string | null;
  className?: string;
  onLeave?: () => void;
  teams?: Team[];
  mySocketId?: string;
}

const MobileVideoGrid: React.FC<MobileVideoGridProps> = ({
  players,
  localPlayerName,
  currentTurnPlayerId,
  className = '',
  onLeave,
  teams = [],
  mySocketId
}) => {
  const {
    localStream,
    remoteStreams,
    speakingPeers,
    connectingPeers,
    isLocalSpeaking,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio
  } = useWebRTC();

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

  // Filter to players who have joined video chat (or are mid-connect), then sort by team.
  // All streams render; beyond 4 the grid scrolls (grid-scroll) instead of hiding players.
  const playersWithStreams = players.filter(player => remoteStreams.has(player.id) || connectingPeers.has(player.id));
  const visiblePlayers = sortPlayersByTeam(playersWithStreams);

  // Calculate grid layout based on player count
  const getGridClass = (count: number): string => {
    if (count <= 1) return 'grid-1';
    if (count === 2) return 'grid-2';
    if (count <= 4) return 'grid-4';
    return 'grid-scroll';
  };

  const getStreamForPlayer = (playerId: string): MediaStream | null => {
    return remoteStreams.get(playerId) || null;
  };

  // Get local player's team color
  const localTeamColor = mySocketId ? getPlayerTeamColor(mySocketId) : undefined;

  return (
    <div className={`mobile-video-grid ${getGridClass(visiblePlayers.length + 1)} ${className}`}>
      {/* Local stream first */}
      {localStream && (
        <div className="mobile-video-grid-item local">
          <WebcamDisplay
            player={{ id: 'local', name: localPlayerName || 'You' }}
            stream={localStream}
            isLocal
            isSpeaking={isLocalSpeaking}
            size="medium"
            teamColor={localTeamColor}
          />
        </div>
      )}

      {/* Remote streams - sorted by team */}
      {visiblePlayers.map((player) => (
        <div
          key={player.id}
          className={`mobile-video-grid-item ${player.id === currentTurnPlayerId ? 'is-turn' : ''}`}
        >
          <WebcamDisplay
            player={player}
            stream={getStreamForPlayer(player.id)}
            isTurn={player.id === currentTurnPlayerId}
            isSpeaking={speakingPeers.has(player.id)}
            size="medium"
            teamColor={getPlayerTeamColor(player.id)}
          />
        </div>
      ))}

      {/* Video Controls */}
      <div className="mobile-video-controls">
        <button
          className={`mobile-video-control-btn ${!isAudioEnabled ? 'off' : ''}`}
          onClick={toggleAudio}
          aria-label={isAudioEnabled ? t('videoControl.muteMic') : t('videoControl.unmuteMic')}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          className={`mobile-video-control-btn ${!isVideoEnabled ? 'off' : ''}`}
          onClick={toggleVideo}
          aria-label={isVideoEnabled ? t('videoControl.cameraOff') : t('videoControl.cameraOn')}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          className="mobile-video-control-btn leave"
          onClick={onLeave}
          aria-label={t('video.leaveVideo')}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MobileVideoGrid;
