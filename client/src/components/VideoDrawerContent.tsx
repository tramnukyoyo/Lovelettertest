import React, { useMemo } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { MobileVideoGrid } from './MobileVideoGrid';

interface VideoDrawerContentProps {
  players: any[];
}

/**
 * Wrapper component for video drawer content
 * Must be rendered inside WebRTCProvider
 * Combines local stream, remote streams, and player data for MobileVideoGrid
 */
export const VideoDrawerContent: React.FC<VideoDrawerContentProps> = ({ players = [] }) => {
  // This hook call is now inside WebRTCProvider boundary
  const { localStream, remoteStreams, isVideoEnabled, prepareVideoChat } = useWebRTC();

  // Combine local stream with remote streams and player data
  const enrichedPlayers = useMemo(() => {
    const enriched = [];

    // Add local stream if available
    if (localStream) {
      enriched.push({
        id: 'self',
        socketId: 'self',
        name: 'You',
        playerName: 'You',
        stream: localStream,
        isActive: true,
        isSelf: true,
        isWebcamOn: true,
      });
    }

    // Add players with their remote streams
    players.forEach((player) => {
      const remoteStream = remoteStreams.get(player.id || player.socketId);
      enriched.push({
        ...player,
        stream: remoteStream || null,
        isActive: remoteStream ? true : false,
        isSelf: false,
        isWebcamOn: remoteStream ? true : false,
      });
    });

    return enriched;
  }, [localStream, remoteStreams, players]);

  return (
    <div className="flex-1 overflow-hidden h-full">
      <MobileVideoGrid
        players={enrichedPlayers}
        isVideoEnabled={isVideoEnabled}
        onJoinVideoChat={prepareVideoChat}
      />
    </div>
  );
};

export default VideoDrawerContent;
