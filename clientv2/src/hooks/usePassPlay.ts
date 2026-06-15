/**
 * usePassPlay Hook
 *
 * Encapsulates Pass & Play socket events and state management.
 * Used by lobby and game pages to control the pass-play flow.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { BasePlayer, PassPlayState } from '../types';
import socketService from '../services/socketService';

interface UsePassPlayOptions {
  roomCode: string;
  players: BasePlayer[];
  passPlay?: PassPlayState;
  settings?: { gameType?: string };
  socket?: Socket;
}

interface UsePassPlayReturn {
  isPassPlay: boolean;
  currentPlayer: BasePlayer | null;
  currentPlayerIndex: number;
  isRevealed: boolean;
  revealData: any;
  allDone: boolean;
  passPlayPhase: PassPlayState['phase'] | null;
  // Actions
  toggleMode: (enabled: boolean) => void;
  addPlayer: (name: string) => Promise<{ success: boolean; message?: string }>;
  removePlayer: (playerId: string) => void;
  reveal: () => void;
  advance: () => void;
  action: (actionName: string, payload?: any) => void;
}

export function usePassPlay({ roomCode, players, passPlay, settings, socket: externalSocket }: UsePassPlayOptions): UsePassPlayReturn {
  const [revealData, setRevealData] = useState<any>(null);
  const [allDone, setAllDone] = useState(false);

  const getSocket = useCallback(() => externalSocket ?? socketService.getSocket(), [externalSocket]);

  const isPassPlay = settings?.gameType === 'pass-play';
  const currentPlayerIndex = passPlay?.currentPlayerIndex ?? 0;
  const isRevealed = passPlay?.revealed ?? false;
  const passPlayPhase = passPlay?.phase ?? null;

  // Find current player from turnOrder
  const currentPlayer = passPlay?.turnOrder
    ? players.find(p => p.id === passPlay.turnOrder[currentPlayerIndex]) ?? null
    : null;

  // Listen for pp:revealed events from server
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRevealed = (data: { revealData: any; playerName: string; playerId: string }) => {
      setRevealData(data.revealData);
    };

    socket.on('pp:revealed', handleRevealed);
    return () => { socket.off('pp:revealed', handleRevealed); };
  }, [getSocket]);

  // Clear reveal data when moving to next player
  useEffect(() => {
    if (!isRevealed) {
      setRevealData(null);
      setAllDone(false);
    }
  }, [isRevealed, currentPlayerIndex]);

  const toggleMode = useCallback((enabled: boolean) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('pp:toggle-mode', {
      roomCode,
      gameType: enabled ? 'pass-play' : 'online',
    });
  }, [roomCode, getSocket]);

  const addPlayer = useCallback((name: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) { resolve({ success: false, message: 'Not connected' }); return; }
      socket.emit('pp:add-player', { roomCode, playerName: name }, (response: any) => {
        resolve(response || { success: false, message: 'No response' });
      });
    });
  }, [roomCode, getSocket]);

  const removePlayer = useCallback((playerId: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('pp:remove-player', { roomCode, playerId });
  }, [roomCode, getSocket]);

  const reveal = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('pp:reveal', { roomCode }, () => {
      // Auto-skipped players: state arrives via roomStateUpdated, no pp:revealed event
    });
  }, [roomCode, getSocket]);

  const advance = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('pp:advance', { roomCode }, (response: any) => {
      if (response?.allDone) {
        setAllDone(true);
      }
    });
  }, [roomCode, getSocket]);

  const action = useCallback((actionName: string, payload?: any) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('pp:action', { roomCode, action: actionName, payload });
  }, [roomCode, getSocket]);

  return {
    isPassPlay,
    currentPlayer,
    currentPlayerIndex,
    isRevealed,
    revealData,
    allDone,
    passPlayPhase,
    toggleMode,
    addPlayer,
    removePlayer,
    reveal,
    advance,
    action,
  };
}
