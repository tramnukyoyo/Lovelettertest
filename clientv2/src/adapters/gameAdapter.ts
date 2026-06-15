/**
 * Game Adapter for Webcam Integration
 *
 * This adapter bridges your game's state to the WebcamConfig interface,
 * allowing the webcam system to work with your game.
 *
 * TODO: Customize this adapter for your game-specific features like:
 * - Turn indicators (showTurnIndicators, getCurrentTurnPlayer)
 * - Lives display (showLives, getLivesForPlayer)
 * - Voting system (showVoting, onVote)
 */

import type { Socket } from 'socket.io-client';
import type { WebcamConfig, WebcamPlayer } from '../config/WebcamConfig';
import type { Lobby } from '../types';
import { getCurrentLanguage } from '../utils/translations';

export function createGameAdapter(
  socket: Socket,
  roomCode: string,
  lobby: Lobby | null
): WebcamConfig {
  return {
    getSocket: () => socket,
    getRoomCode: () => roomCode,
    getUserId: () => lobby?.mySocketId || socket?.id || '',
    getLanguage: () => getCurrentLanguage(),

    // Required for video feed rendering
    getUserRole: () => {
      if (!lobby) return 'player';
      const myPlayer = lobby.players.find(p => p.socketId === lobby.mySocketId);
      return myPlayer?.isHost ? 'gamemaster' : 'player';
    },

    getGamemaster: () => {
      if (!lobby) return null;
      const hostPlayer = lobby.players.find(p => p.isHost);
      if (!hostPlayer) return null;
      return {
        id: hostPlayer.socketId,
        name: hostPlayer.name
      };
    },

    getPlayers: (): WebcamPlayer[] => {
      if (!lobby || !lobby.players) return [];
      return lobby.players.map(player => ({
        id: player.socketId,
        name: player.name,
        score: player.score || 0,
      }));
    },

    // ========================================
    // TODO: Add game-specific UI features here
    // ========================================

    // Example: Turn-based game
    // showTurnIndicators: true,
    // getCurrentTurnPlayer: () => {
    //   if (!lobby?.gameData?.currentTurn) return null;
    //   return lobby.gameData.currentTurn;
    // },

    // Example: Lives system
    // showLives: true,
    // getLivesForPlayer: (playerId: string) => {
    //   const player = lobby?.players.find(p => p.socketId === playerId);
    //   return player?.lives || 0;
    // },

    // Example: Voting system
    // showVoting: lobby?.state === 'VOTING',
    // getHasVoted: () => {
    //   // Return true if current player has voted
    //   return false;
    // },
    // onVote: (playerId: string) => {
    //   socket.emit('game:vote', { roomCode, votedFor: playerId });
    // },
  };
}
