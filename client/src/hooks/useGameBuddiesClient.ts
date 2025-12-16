import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import socketService from '../services/socketService';
import {
  getCurrentSession,
  resolvePendingSession,
} from '../services/gameBuddiesSession';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import type {
  ChatMessage,
  GameEndedPayload,
  GameSyncResponse,
  HostTransferPayload,
  Lobby,
  PlayerJoinLeavePayload,
  PlayerListUpdatePayload,
  SessionReconnectResponse,
  SettingsUpdatePayload,
} from '../types';

type LobbyUpdater = (prev: Lobby | null) => Lobby | null;

export interface RegisterGameEventsHelpers {
  setLobbyState: (lobby: Lobby) => void;
  patchLobby: (updater: LobbyUpdater) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setError: (value: string) => void;
}

export interface UseGameBuddiesClientOptions {
  /**
   * Register additional game-specific socket listeners.
   * Return a cleanup function to remove them.
   */
  registerGameEvents?: (
    socket: Socket,
    helpers: RegisterGameEventsHelpers
  ) => void | (() => void);
}

interface UseGameBuddiesClientResult {
  lobby: Lobby | null;
  messages: ChatMessage[];
  error: string;
  isConnected: boolean;
  socket: Socket | null;
  gameBuddiesSession: GameBuddiesSession | null;
  createRoom: (
    playerName: string,
    session: GameBuddiesSession | null,
    streamerMode?: boolean
  ) => void;
  joinRoom: (
    roomCode: string,
    playerName: string,
    session: GameBuddiesSession | null
  ) => void;
  clearError: () => void;
  patchLobby: (updater: LobbyUpdater) => void;
  setLobbyState: (lobby: Lobby) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

/**
 * GameBuddies-aware client hook that centralizes:
 * - Room lifecycle (create/join)
 * - Session token reconnection
 * - Player list updates
 * - Chat updates
 * - GameBuddies session auto-join/create
 *
 * It exposes small helper functions so game-specific screens can keep their logic focused.
 */
export function useGameBuddiesClient(
  options: UseGameBuddiesClientOptions = {}
): UseGameBuddiesClientResult {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [gameBuddiesSession, setGameBuddiesSession] = useState<GameBuddiesSession | null>(null);

  const isReconnecting = useRef(false);
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay);
    timeoutRefs.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  const setLobbyState = useCallback((nextLobby: Lobby) => {
    setLobby(nextLobby);
    if (nextLobby.messages) {
      setMessages(nextLobby.messages);
    }
  }, []);

  const patchLobby = useCallback((updater: LobbyUpdater) => {
    setLobby((prev) => updater(prev));
  }, []);

  const pushChatMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message].slice(-100));
  }, []);

  const persistReconnectionData = useCallback(
    (room: Lobby, sessionToken?: string) => {
      if (!sessionToken) return;
      const myPlayer = room.players.find((p) => p.socketId === room.mySocketId);
      if (myPlayer) {
        socketService.persistReconnectionData(room.code, myPlayer.name, sessionToken);
      }
    },
    []
  );

  const createRoom = useCallback((
    playerName: string,
    session: GameBuddiesSession | null,
    streamerMode = false
  ) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const sessionWithMode = session
      ? {
          ...session,
          isStreamerMode: streamerMode,
          hideRoomCode: streamerMode || session.hideRoomCode,
        }
      : null;

    setGameBuddiesSession(sessionWithMode);

    console.log('[useGameBuddiesClient] createRoom - sending userId:', sessionWithMode?.userId);

    socket.emit('room:create', {
      playerName,
      playerId: sessionWithMode?.playerId,
      userId: sessionWithMode?.userId,
      roomCode: sessionWithMode?.roomCode,
      isGameBuddiesRoom: !!sessionWithMode,
      sessionToken: sessionWithMode?.sessionToken,
      premiumTier: sessionWithMode?.premiumTier,
      avatarUrl: sessionWithMode?.avatarUrl,
      streamerMode,
      hideRoomCode: streamerMode,
    });
  }, []);

  const joinRoom = useCallback((
    roomCode: string,
    playerName: string,
    session: GameBuddiesSession | null
  ) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    setGameBuddiesSession(session);

    console.log('[useGameBuddiesClient] joinRoom - sending userId:', session?.userId);

    const isInviteToken = roomCode.length > 10;
    socket.emit('room:join', {
      roomCode: isInviteToken ? undefined : roomCode,
      inviteToken: isInviteToken ? roomCode : undefined,
      playerName,
      playerId: session?.playerId,
      userId: session?.userId,
      premiumTier: session?.premiumTier,
      avatarUrl: session?.avatarUrl,
      sessionToken: session?.sessionToken,
    });
  }, []);

  const handleReconnection = useCallback((token: string): Promise<boolean> => {
    const socket = socketService.getSocket();
    if (!socket || isReconnecting.current) {
      return Promise.resolve(false);
    }

    isReconnecting.current = true;

    return new Promise((resolve) => {
      socket.emit('session:reconnect', { sessionToken: token }, (response: SessionReconnectResponse) => {
        isReconnecting.current = false;

        if (response.success && response.lobby) {
          setLobbyState(response.lobby);
          setError('');

          const newToken = response.sessionToken || token;
          sessionStorage.setItem('gameSessionToken', newToken);
          persistReconnectionData(response.lobby, newToken);

          addTimeout(() => {
            socket.emit(
              'game:sync-state',
              { roomCode: response.lobby!.code },
              (syncResponse: GameSyncResponse) => {
                if (syncResponse.success && syncResponse.room) {
                  setLobbyState(syncResponse.room);
                }
              }
            );
          }, 100);

          resolve(true);
        } else {
          sessionStorage.removeItem('gameSessionToken');
          socketService.clearReconnectionData();
          resolve(false);
        }
      });
    });
  }, [addTimeout, persistReconnectionData, setLobbyState]);

  // Register core socket events once
  useEffect(() => {
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    const onConnect = async () => {
      setIsConnected(true);

      const urlSessionToken = new URLSearchParams(window.location.search).get('session');
      const storedSessionToken = sessionStorage.getItem('gameSessionToken');

      // If the user followed a fresh GameBuddies link, discard stale reconnection data
      if (urlSessionToken && storedSessionToken && urlSessionToken !== storedSessionToken) {
        sessionStorage.removeItem('gameSessionToken');
        socketService.clearReconnectionData();
      }

      if (storedSessionToken && !isReconnecting.current) {
        const reconnected = await handleReconnection(storedSessionToken);
        if (reconnected) return; // Successful reconnection, nothing else to do
      }

      let session = getCurrentSession();
      if (!session) {
        session = await resolvePendingSession();
      } else if (session.sessionToken && !session.roomCode) {
        session = await resolvePendingSession();
      }

      if (session) {
        setGameBuddiesSession(session);
        if (session.isHost) {
          addTimeout(() => createRoom(session.playerName || 'Host', session, session.isStreamerMode || session.hideRoomCode || false), 100);
        } else if (session.playerName) {
          addTimeout(() => joinRoom(session.roomCode, session.playerName!, session), 100);
        }
      }
    };

    const onDisconnect = () => setIsConnected(false);

    const onRoomCreated = (data: { room: Lobby; sessionToken?: string }) => {
      setLobbyState(data.room);
      setError('');
      if (data.sessionToken) {
        sessionStorage.setItem('gameSessionToken', data.sessionToken);
        persistReconnectionData(data.room, data.sessionToken);
        // Update session state with new token to ensure API calls use the valid token
        setGameBuddiesSession(prev => prev ? { ...prev, sessionToken: data.sessionToken } : null);
      }
    };

    const onRoomJoined = (data: { room: Lobby; sessionToken?: string }) => {
      setLobbyState(data.room);
      setError('');
      if (data.sessionToken) {
        sessionStorage.setItem('gameSessionToken', data.sessionToken);
        persistReconnectionData(data.room, data.sessionToken);
        // Update session state with new token to ensure API calls use the valid token
        setGameBuddiesSession(prev => prev ? { ...prev, sessionToken: data.sessionToken } : null);
      }
    };

    const onPlayerEvent = (data: PlayerJoinLeavePayload) => {
      setLobby((prev) => (prev ? { ...prev, players: data.players } : prev));
    };

    const onHostTransferred = (data: HostTransferPayload) => {
      setLobby((prev) => {
        if (!prev) return prev;
        return { ...prev, hostId: data.newHostId, players: data.players };
      });
    };

    const onPlayerListUpdate = (data: PlayerListUpdatePayload) => {
      setLobby((prev) => (prev ? { ...prev, players: data.players } : prev));
    };

    const onSettingsUpdated = (data: SettingsUpdatePayload) => {
      setLobby((prev) => (prev ? { ...prev, settings: data.settings } : prev));
    };

    const onGameStarted = (data: { lobby?: Lobby }) => {
      if (data.lobby) setLobbyState(data.lobby);
    };

    const onGameEnded = (data: GameEndedPayload) => {
      if (data.lobby) setLobbyState(data.lobby);
    };

    const onChatMessage = (message: ChatMessage) => pushChatMessage(message);

    const onError = (data: { message: string }) => setError(data.message);

    const onKicked = (data: { message: string }) => {
      alert(data.message);
      setLobby(null);
      setMessages([]);
      setError('');
      socketService.clearReconnectionData();
      sessionStorage.removeItem('gameSessionToken');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:created', onRoomCreated);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:player-joined', onPlayerEvent);
    socket.on('room:player-left', onPlayerEvent);
    socket.on('room:player-disconnected', onPlayerEvent);
    socket.on('room:player-reconnected', onPlayerEvent);
    socket.on('room:host-transferred', onHostTransferred);
    socket.on('room:player-list-update', onPlayerListUpdate);
    socket.on('room:settings-updated', onSettingsUpdated);
    socket.on('game:started', onGameStarted);
    socket.on('game:ended', onGameEnded);
    socket.on('chat:message', onChatMessage);
    socket.on('error', onError);
    socket.on('player:kicked', onKicked);

    const cleanupGameEvents = options.registerGameEvents?.(socket, {
      setLobbyState,
      patchLobby,
      setMessages,
      setError,
    });

    return () => {
      clearAllTimeouts();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:created', onRoomCreated);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:player-joined', onPlayerEvent);
      socket.off('room:player-left', onPlayerEvent);
      socket.off('room:player-disconnected', onPlayerEvent);
      socket.off('room:player-reconnected', onPlayerEvent);
      socket.off('room:host-transferred', onHostTransferred);
      socket.off('room:player-list-update', onPlayerListUpdate);
      socket.off('room:settings-updated', onSettingsUpdated);
      socket.off('game:started', onGameStarted);
      socket.off('game:ended', onGameEnded);
      socket.off('chat:message', onChatMessage);
      socket.off('error', onError);
      socket.off('player:kicked', onKicked);

      if (typeof cleanupGameEvents === 'function') {
        cleanupGameEvents();
      }

      socketService.disconnect();
    };
  }, [
    addTimeout,
    clearAllTimeouts,
    createRoom,
    joinRoom,
    options.registerGameEvents,
    patchLobby,
    persistReconnectionData,
    pushChatMessage,
    setLobbyState,
    handleReconnection,
  ]);

  return {
    lobby,
    messages,
    error,
    isConnected,
    socket: socketService.getSocket(),
    gameBuddiesSession,
    createRoom,
    joinRoom,
    clearError: () => setError(''),
    patchLobby,
    setLobbyState,
    setMessages,
  };
}
