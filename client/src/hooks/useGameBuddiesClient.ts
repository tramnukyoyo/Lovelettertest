import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import socketService from '../services/socketService';
import {
  getCurrentSession,
  resolvePendingSession,
  clearSession,
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

const GB_HOST_LAUNCH_DELAY_MS = 0;
const GB_PLAYER_LAUNCH_DELAY_MS = 350;
const GB_PLAYER_RETRY_DELAY_MS = 700;
const GB_PLAYER_MAX_JOIN_RETRIES = 8;

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
  kickMessage: string | null;
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
  clearKickMessage: () => void;
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
  const [kickMessage, setKickMessage] = useState<string | null>(null);

  // Stabilize registerGameEvents ref to prevent re-registration on every render
  const registerGameEventsRef = useRef(options.registerGameEvents);
  registerGameEventsRef.current = options.registerGameEvents;

  const isReconnecting = useRef(false);
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const pendingLaunchSessionRef = useRef<GameBuddiesSession | null>(null);
  const playerJoinRetryCountRef = useRef(0);
  const launchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay);
    timeoutRefs.current.push(id);
    return id;
  }, []);

  const clearPendingLaunchTimer = useCallback(() => {
    if (launchTimerRef.current) {
      clearTimeout(launchTimerRef.current);
      launchTimerRef.current = null;
    }
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    clearPendingLaunchTimer();
  }, [clearPendingLaunchTimer]);

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
      guestUserId: localStorage.getItem('gb_guestUserId') || undefined,
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
      guestUserId: localStorage.getItem('gb_guestUserId') || undefined,
    });
  }, []);

  const scheduleGameBuddiesLaunch = useCallback((
    session: GameBuddiesSession,
    attempt: number
  ) => {
    clearPendingLaunchTimer();
    pendingLaunchSessionRef.current = session;
    playerJoinRetryCountRef.current = session.isHost ? 0 : attempt;

    const delay = session.isHost
      ? GB_HOST_LAUNCH_DELAY_MS
      : attempt === 0
        ? GB_PLAYER_LAUNCH_DELAY_MS
        : GB_PLAYER_RETRY_DELAY_MS;

    launchTimerRef.current = setTimeout(() => {
      if (session.isHost) {
        createRoom(
          session.playerName || 'Host',
          session,
          session.isStreamerMode || session.hideRoomCode || false
        );
        return;
      }

      if (session.playerName) {
        joinRoom(session.roomCode, session.playerName, session);
      }
    }, delay);
  }, [clearPendingLaunchTimer, createRoom, joinRoom]);

  const handleReconnection = useCallback((token: string): Promise<boolean> => {
    const socket = socketService.getSocket();
    if (!socket || isReconnecting.current) {
      return Promise.resolve(false);
    }

    isReconnecting.current = true;

    // Safety timeout: clear reconnecting flag if server never responds
    const reconnectTimeout = setTimeout(() => {
      if (isReconnecting.current) {
        isReconnecting.current = false;
        console.warn('[useGameBuddiesClient] Reconnection timed out after 10s');
      }
    }, 10000);

    return new Promise((resolve) => {
      socket.emit('session:reconnect', { sessionToken: token }, (response: SessionReconnectResponse) => {
        clearTimeout(reconnectTimeout);
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
    let socketRef: ReturnType<typeof socketService.getSocket> = null;
    let mounted = true;
    let cleanupGameEvents: void | (() => void) = undefined;

    const initSocket = async () => {
      const socket = await socketService.connect();
      if (!mounted) return;
      socketRef = socket;
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
      try {
        if (!session) {
          session = await resolvePendingSession();
        } else if (session.sessionToken && !session.roomCode) {
          session = await resolvePendingSession();
        }
      } catch (err) {
        console.error('[useGameBuddiesClient] Session resolution failed:', err);
      }

      if (session) {
        setGameBuddiesSession(session);
        if (session.isHost) {
          const samePendingLaunch =
            pendingLaunchSessionRef.current?.sessionToken === session.sessionToken &&
            pendingLaunchSessionRef.current?.roomCode === session.roomCode &&
            pendingLaunchSessionRef.current?.playerId === session.playerId &&
            pendingLaunchSessionRef.current?.isHost === session.isHost;

          if (!samePendingLaunch) {
            playerJoinRetryCountRef.current = 0;
          }

          if (!samePendingLaunch || !launchTimerRef.current) {
            scheduleGameBuddiesLaunch(session, playerJoinRetryCountRef.current);
          }
        } else if (session.playerName) {
          const samePendingLaunch =
            pendingLaunchSessionRef.current?.sessionToken === session.sessionToken &&
            pendingLaunchSessionRef.current?.roomCode === session.roomCode &&
            pendingLaunchSessionRef.current?.playerId === session.playerId &&
            pendingLaunchSessionRef.current?.isHost === session.isHost;

          if (!samePendingLaunch) {
            playerJoinRetryCountRef.current = 0;
          }

          if (!samePendingLaunch || !launchTimerRef.current) {
            scheduleGameBuddiesLaunch(session, playerJoinRetryCountRef.current);
          }
        }
      }
    };

    const onDisconnect = () => {
      clearPendingLaunchTimer();
      setIsConnected(false);
    };

    const onRoomCreated = (data: { room: Lobby; sessionToken?: string; guestUserId?: string }) => {
      clearPendingLaunchTimer();
      pendingLaunchSessionRef.current = null;
      playerJoinRetryCountRef.current = 0;
      setLobbyState(data.room);
      setError('');
      if (data.sessionToken) {
        sessionStorage.setItem('gameSessionToken', data.sessionToken);
        persistReconnectionData(data.room, data.sessionToken);
        // Update session state with new token to ensure API calls use the valid token
        setGameBuddiesSession(prev => prev ? { ...prev, sessionToken: data.sessionToken } : null);
      }
      if (data.guestUserId) {
        localStorage.setItem('gb_guestUserId', data.guestUserId);
      }
    };

    const onRoomJoined = (data: { room: Lobby; sessionToken?: string; guestUserId?: string }) => {
      clearPendingLaunchTimer();
      pendingLaunchSessionRef.current = null;
      playerJoinRetryCountRef.current = 0;
      setLobbyState(data.room);
      setError('');
      if (data.sessionToken) {
        sessionStorage.setItem('gameSessionToken', data.sessionToken);
        persistReconnectionData(data.room, data.sessionToken);
        // Update session state with new token to ensure API calls use the valid token
        setGameBuddiesSession(prev => prev ? { ...prev, sessionToken: data.sessionToken } : null);
      }
      if (data.guestUserId) {
        localStorage.setItem('gb_guestUserId', data.guestUserId);
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

    const onChatBlocked = () => pushChatMessage({ id: `sys-blocked-${Date.now()}`, playerId: 'system', playerName: 'System', message: 'Your message wasn’t sent — please keep it friendly.', timestamp: Date.now(), isSystem: true });

    const onError = (data: { message: string; code?: string }) => {
      const isNotInRoom = data.code === 'NOT_IN_ROOM' || data.message === 'Not in a room';
      if (isNotInRoom) {
        const sessionToken = sessionStorage.getItem('gameSessionToken');
        if (sessionToken) {
          socketService.getSocket()?.emit('session:reconnect', { sessionToken });
          // clear the visible error and stop here
          setError('');
          return;
        }
      }

      const pendingSession = pendingLaunchSessionRef.current;
      const shouldRetryJoin =
        !!pendingSession &&
        !pendingSession.isHost &&
        (data.code === 'ROOM_NOT_FOUND' || data.message === 'Room not found');

      if (shouldRetryJoin && playerJoinRetryCountRef.current < GB_PLAYER_MAX_JOIN_RETRIES) {
        const nextAttempt = playerJoinRetryCountRef.current + 1;
        setError('');
        scheduleGameBuddiesLaunch(pendingSession, nextAttempt);
        return;
      }

      clearPendingLaunchTimer();
      pendingLaunchSessionRef.current = null;
      setError(data.message);
    };

    const onKicked = (data: { message: string }) => {
      console.log('[KICK-CLIENT] ===== RECEIVED player:kicked =====');
      clearPendingLaunchTimer();
      pendingLaunchSessionRef.current = null;
      clearSession();
      socketService.clearReconnectionData();
      sessionStorage.removeItem('gameSessionToken');
      window.history.replaceState({}, '', window.location.pathname);
      setGameBuddiesSession(null);
      setKickMessage(data.message);
      setLobby(null);
      setMessages([]);
      setError('');
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
    socket.on('chat:blocked', onChatBlocked);
    socket.on('error', onError);
    socket.on('player:kicked', onKicked);

    // If socket is already connected, fire onConnect manually
    // (handles race condition where connect event already fired before listener registered)
    if (socket.connected) {
      console.log('[GB-DEBUG] Socket already connected — calling onConnect manually');
      onConnect();
    } else {
      console.log('[GB-DEBUG] Socket not yet connected — waiting for connect event');
    }

    cleanupGameEvents = registerGameEventsRef.current?.(socket, {
      setLobbyState,
      patchLobby,
      setMessages,
      setError,
    });
    };

    initSocket();

    // IMPORTANT: Pass handler refs to .off() to avoid removing ALL listeners
    return () => {
      mounted = false;
      clearAllTimeouts();
      if (socketRef) {
        socketRef.removeAllListeners('connect');
        socketRef.removeAllListeners('disconnect');
        socketRef.removeAllListeners('room:created');
        socketRef.removeAllListeners('room:joined');
        socketRef.removeAllListeners('room:player-joined');
        socketRef.removeAllListeners('room:player-left');
        socketRef.removeAllListeners('room:player-disconnected');
        socketRef.removeAllListeners('room:player-reconnected');
        socketRef.removeAllListeners('room:host-transferred');
        socketRef.removeAllListeners('room:player-list-update');
        socketRef.removeAllListeners('room:settings-updated');
        socketRef.removeAllListeners('game:started');
        socketRef.removeAllListeners('game:ended');
        socketRef.removeAllListeners('chat:message');
        socketRef.removeAllListeners('chat:blocked');
        socketRef.removeAllListeners('error');
        socketRef.removeAllListeners('player:kicked');
      }

      if (typeof cleanupGameEvents === 'function') {
        cleanupGameEvents();
      }

      socketService.disconnect();
    };
  }, [
    addTimeout,
    clearAllTimeouts,
    clearPendingLaunchTimer,
    createRoom,
    joinRoom,
    patchLobby,
    persistReconnectionData,
    pushChatMessage,
    scheduleGameBuddiesLaunch,
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
    kickMessage,
    createRoom,
    joinRoom,
    clearError: () => setError(''),
    clearKickMessage: () => setKickMessage(null),
    patchLobby,
    setLobbyState,
    setMessages,
  };
}
