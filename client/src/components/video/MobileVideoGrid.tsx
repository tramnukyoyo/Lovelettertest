/**
 * Mobile Video Grid
 *
 * Grid layout for video feeds on mobile devices.
 * Optimized for portrait and landscape orientations.
 */

import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useWebRTC } from './adapters';
import WebcamDisplay from './WebcamDisplay';
import type { WebcamPlayer } from './adapters';
import type { Team } from './adapters';
import { getBroadcastCopy } from './broadcastCopy';

interface MobileVideoGridProps {
  players: WebcamPlayer[];
  localPlayerName?: string;
  currentTurnPlayerId?: string | null;
  maxVisible?: number;
  className?: string;
  onLeave?: () => void;
  teams?: Team[];
  mySocketId?: string;
}

const MobileVideoGrid: React.FC<MobileVideoGridProps> = ({
  players,
  localPlayerName,
  currentTurnPlayerId,
  maxVisible = 4,
  className = '',
  onLeave,
  teams = [],
  mySocketId
}) => {
  const copy = getBroadcastCopy();
  const {
    localStream,
    remoteStreams,
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

  // Filter to only players who have joined video chat, then sort by team, then limit visible
  const playersWithStreams = players.filter(player => remoteStreams.has(player.id));
  const sortedPlayers = sortPlayersByTeam(playersWithStreams);
  const visiblePlayers = sortedPlayers.slice(0, maxVisible);
  const hiddenCount = sortedPlayers.length - maxVisible;

  // Calculate grid layout based on player count
  const getGridClass = (count: number): string => {
    if (count <= 1) return 'grid-1';
    if (count === 2) return 'grid-2';
    if (count <= 4) return 'grid-4';
    return 'grid-4'; // Max 4 visible
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
            player={{ id: 'local', name: localPlayerName || copy.mobileGrid.you }}
            stream={localStream}
            isLocal
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
            size="medium"
            teamColor={getPlayerTeamColor(player.id)}
          />
        </div>
      ))}

      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <div className="mobile-video-grid-overflow">
          <span>+{hiddenCount} {copy.mobileGrid.more}</span>
        </div>
      )}

      {/* Video Controls */}
      <div className="mobile-video-controls">
        <button
          className={`mobile-video-control-btn ${!isAudioEnabled ? 'off' : ''}`}
          onClick={toggleAudio}
          aria-label={isAudioEnabled ? copy.controls.muteMicrophone : copy.controls.unmuteMicrophone}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          className={`mobile-video-control-btn ${!isVideoEnabled ? 'off' : ''}`}
          onClick={toggleVideo}
          aria-label={isVideoEnabled ? copy.controls.turnOffCamera : copy.controls.turnOnCamera}
        >
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          className="mobile-video-control-btn leave"
          onClick={onLeave}
          aria-label={copy.controls.leaveVideoChat}
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default MobileVideoGrid;
