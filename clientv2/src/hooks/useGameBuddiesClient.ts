/**
 * GameBuddies Client Hook
 *
 * Central hook for managing:
 * - Socket connection and lifecycle
 * - Room creation/joining
 * - Session reconnection
 * - Player list updates
 * - Chat messages
 * - GameBuddies session auto-join/create
 *
 * TODO: Add game-specific events via registerGameEvents option
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import socketService from '../services/socketService';
import { pinRegion, getCachedRegion, hadUrlRegionPin } from '../services/regionService';
import {
  getCurrentSession,
  resolvePendingSession,
  clearSession,
} from '../services/gameBuddiesSession';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import { getAuthUserId } from '../services/supabaseAuth';
import type {
  ChatMessage,
  Lobby,
  Player,
  Settings,
} from '../types';

// Captured at module load: the entry URL's join intent (?room= / ?invite=).
// HomePage strips the URL via history.replaceState before the socket connects,
// so a live read inside onConnect would miss it. Used by the wrong-region
// redirect replay below.
const _initialJoinParam: string | null = (() => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('room') || p.get('invite');
  } catch {
    return null;
  }
})();

// Response types for socket callbacks
interface SessionReconnectResponse {
  success: boolean;
  lobby?: Lobby;
  sessionToken?: string;
  reason?: string;
  roomCode?: string;
  /** Owning region when reason === 'wrong_region' (multi-region split-brain guard) */
  region?: 'eu' | 'us';
}

interface GameSyncResponse {
  success: boolean;
  room?: Lobby;
}

interface PlayerJoinLeavePayload {
  players: Player[];
}

interface HostTransferPayload {
  newHostId: string;
  players: Player[];
}

interface HostMigratedPayload {
  newHostId: string;
  newHostName: string;
  newHostSocketId: string;
  message: string;
}

interface PlayerListUpdatePayload {
  players: Player[];
}

interface SettingsUpdatePayload {
  settings: Settings;
}

interface GameEndedPayload {
  lobby?: Lobby;
}

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
   *
   * @example
   * registerGameEvents: (socket, helpers) => {
   *   const onGameAction = (data) => {
   *     helpers.patchLobby(prev => ({
   *       ...prev,
   *       gameData: { ...prev?.gameData, ...data }
   *     }));
   *   };
   *   socket.on('game:action', onGameAction);
   *   return () => socket.off('game:action', onGameAction);
   * }
   */
  registerGameEvents?: (
    socket: Socket,
    helpers: RegisterGameEventsHelpers
  ) => void | (() => void);
}

export interface UseGameBuddiesClientResult {
  lobby: Lobby | null;
  messages: ChatMessage[];
  error: string;
  isConnected: boolean;
  socket: Socket | null;
  gameBuddiesSession: GameBuddiesSession | null;
  kickMessage: string | null;
  clearKickMessage: () => void;
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
  restartGame: () => void;
  updateSettings: (settings: Record<string, any>) => void;
  startGame: () => void;
}

/**
 * GameBuddies-aware client hook that centralizes:
 * - Room lifecycle (create/join)
 * - Session token reconnection
 * - Player list updates
 * - Chat updates
 * - GameBuddies session auto-join/create
 *
 * It exposes helper functions so game-specific screens can keep their logic focused.
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

  const isReconnecting = useRef(false);
  // Throttle for the onConnect auto create/join: a socket flap during boot can
  // fire 'connect' twice before the first create/join resolves, double-joining
  // the player (duplicate-guest bug class). The old code was partially shielded
  // by the always-attempted session:reconnect; the fresh-handoff fast path
  // skips that, so guard explicitly. 5s is far above a create/join RTT but
  // short enough that a genuinely failed attempt retries on the next reconnect.
  const lastAutoJoinAt = useRef(0);
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

    // Clear stale session data when creating a standalone room
    if (!session) {
      clearSession();
    }

    setGameBuddiesSession(sessionWithMode);


    socket.emit('room:create', {
      playerName,
      playerId: sessionWithMode?.playerId,
      // Standalone but signed in via the in-game modal (shared platform
      // session): claim the userId so the seat starts authenticated. The
      // server treats client userIds as unvalidated (premium stays 'free')
      // until gb:auth:upgrade re-validates with the access token ~1s later.
      userId: sessionWithMode?.userId ?? getAuthUserId() ?? undefined,
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


    const isInviteToken = roomCode.length > 10;
    // Remember the attempted invite token so onError can retry the other
    // region once for legacy pin-less invite links (INVALID_INVITE).
    if (isInviteToken) sessionStorage.setItem('gb_lastInviteToken', roomCode);
    // Remember the full join intent (code + name) so a wrong-region redirect
    // can replay the join automatically after the pinned navigation reload.
    try {
      sessionStorage.setItem('gb_lastJoinAttempt', JSON.stringify({ code: roomCode, playerName, ts: Date.now() }));
    } catch { /* storage blocked — replay just won't happen */ }
    socket.emit('room:join', {
      roomCode: isInviteToken ? undefined : roomCode,
      inviteToken: isInviteToken ? roomCode : undefined,
      playerName,
      playerId: session?.playerId,
      // Same in-game-login fallback as room:create above.
      userId: session?.userId ?? getAuthUserId() ?? undefined,
      premiumTier: session?.premiumTier,
      avatarUrl: session?.avatarUrl,
      sessionToken: session?.sessionToken,
      guestUserId: localStorage.getItem('gb_guestUserId') || undefined,
    });
  }, []);

  const handleReconnection = useCallback((token: string): Promise<boolean> => {
    const socket = socketService.getSocket();
    if (!socket || isReconnecting.current) {
      return Promise.resolve(false);
    }

    isReconnecting.current = true;

    return new Promise((resolve) => {
      socket.timeout(15000).emit('session:reconnect', { sessionToken: token }, (err: Error | null, response: SessionReconnectResponse) => {
        isReconnecting.current = false;

        if (err) {
          console.warn('[useGameBuddiesClient] session:reconnect timed out:', err.message);
          setError('Reconnecting to the game timed out. Retrying on next connection…');
          resolve(false);
          return;
        }

        if (response.success && response.lobby) {
          setLobbyState(response.lobby);
          setError('');

          const newToken = response.sessionToken || token;
          sessionStorage.setItem('gameSessionToken', newToken);
          persistReconnectionData(response.lobby, newToken);

          socket.emit(
            'game:sync-state',
            { roomCode: response.lobby!.code },
            (syncResponse: GameSyncResponse) => {
              if (syncResponse.success && syncResponse.room) {
                setLobbyState(syncResponse.room);
              }
            }
          );

          resolve(true);
        } else if (response.reason === 'wrong_worker') {
          // Cluster: we reconnected to a worker that does not own this room. The
          // session is still valid — do NOT clear it. Persist the routing hint and
          // do ONE guarded full reload so the socket Manager is rebuilt with
          // ?roomCode= in its query and the master routes us to the owning worker.
          if (response.roomCode) sessionStorage.setItem('lastRoomCode', response.roomCode);
          const nowWW = Date.now();
          const lastWW = Number(sessionStorage.getItem('gb_wrongWorkerReloadAt') || 0);
          if (nowWW - lastWW > 15000) {
            sessionStorage.setItem('gb_wrongWorkerReloadAt', String(nowWW));
            console.warn('[useGameBuddiesClient] session:reconnect wrong worker — reloading with routing hint');
            resolve(false);
            window.location.reload();
            return;
          }
          console.warn('[useGameBuddiesClient] session:reconnect wrong worker — reload throttled');
          resolve(false);
        } else if (response.reason === 'wrong_region' && (response.region === 'eu' || response.region === 'us')) {
          // Multi-region: the room lives on the OTHER regional server. The
          // session is still valid there — do NOT clear it. Pin the owning
          // region (sessionStorage handoff) and do ONE guarded reload; the
          // rebuilt socket then connects to the right server and this same
          // session:reconnect succeeds there.
          if (response.roomCode) sessionStorage.setItem('lastRoomCode', response.roomCode);
          pinRegion(response.region);
          const nowWR = Date.now();
          const lastWR = Number(sessionStorage.getItem('gb_wrongRegionReloadAt') || 0);
          if (nowWR - lastWR > 15000) {
            sessionStorage.setItem('gb_wrongRegionReloadAt', String(nowWR));
            console.warn(`[useGameBuddiesClient] session:reconnect wrong region — reloading pinned to ${response.region.toUpperCase()}`);
            resolve(false);
            window.location.reload();
            return;
          }
          console.warn('[useGameBuddiesClient] session:reconnect wrong region — reload throttled');
          resolve(false);
        } else {
          sessionStorage.removeItem('gameSessionToken');
          socketService.clearReconnectionData();
          setError('Your game session could not be restored — the room may have ended.');
          resolve(false);
        }
      });
    });
  }, [persistReconnectionData, setLobbyState]);

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

      if (storedSessionToken) {
        if (isReconnecting.current) {
          // A reconnect for this session is already in flight (a 2nd 'connect'
          // during socket flapping). Do NOT fall through to createRoom/joinRoom —
          // that races the in-flight session:reconnect and double-joins / spawns a
          // duplicate room. Let the in-flight attempt own the rejoin.
          return;
        }
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
        const now = Date.now();
        if (now - lastAutoJoinAt.current < 5000) {
          return; // create/join from a previous connect event is still in flight
        }
        lastAutoJoinAt.current = now;
        if (session.isHost) {
          createRoom(session.playerName || 'Host', session, session.isStreamerMode || session.hideRoomCode || false);
        } else if (session.playerName) {
          joinRoom(session.roomCode, session.playerName!, session);
        }
      } else if (_initialJoinParam && hadUrlRegionPin()) {
        // Wrong-region redirect replay: the redirect navigated with
        // ?room=/?invite= + gbRegion but the reload lost the user's entered
        // name and click. If this load matches a join attempted seconds ago,
        // replay it automatically instead of making the user re-type.
        try {
          const raw = sessionStorage.getItem('gb_lastJoinAttempt');
          if (raw) {
            const attempt = JSON.parse(raw) as { code?: string; playerName?: string; ts?: number };
            const fresh = !!attempt.ts && Date.now() - attempt.ts < 45_000;
            const matches = !!attempt.code && attempt.code.toUpperCase() === _initialJoinParam.toUpperCase();
            if (fresh && matches && attempt.playerName) {
              sessionStorage.removeItem('gb_lastJoinAttempt');
              const now = Date.now();
              if (now - lastAutoJoinAt.current >= 5000) {
                lastAutoJoinAt.current = now;
                console.log('[useGameBuddiesClient] replaying join after region redirect');
                joinRoom(attempt.code!, attempt.playerName, null);
              }
            }
          }
        } catch { /* malformed stash — fall through to the normal join form */ }
      }
    };

    const onDisconnect = () => setIsConnected(false);

    const onRoomCreated = (data: { room: Lobby; sessionToken?: string; guestUserId?: string }) => {
      setLobbyState(data.room);
      setError('');
      if (data.sessionToken) {
        sessionStorage.setItem('gameSessionToken', data.sessionToken);
        persistReconnectionData(data.room, data.sessionToken);
        setGameBuddiesSession(prev => prev ? { ...prev, sessionToken: data.sessionToken } : null);
      }
      if (data.guestUserId) {
        localStorage.setItem('gb_guestUserId', data.guestUserId);
      }
    };

    const onRoomJoined = (data: { room: Lobby; sessionToken?: string; guestUserId?: string }) => {
      setLobbyState(data.room);
      setError('');
      if (data.sessionToken) {
        sessionStorage.setItem('gameSessionToken', data.sessionToken);
        persistReconnectionData(data.room, data.sessionToken);
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

    const onHostMigrated = (data: HostMigratedPayload) => {
      patchLobby((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hostId: data.newHostId,
          players: prev.players.map((p) => ({
            ...p,
            isHost: p.id === data.newHostId,
          })),
        };
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

    const onGameRestarted = (data: { lobby?: Lobby }) => {
      if (data.lobby) setLobbyState(data.lobby);
    };

    const onChatMessage = (message: ChatMessage) => pushChatMessage(message);

    const onChatBlocked = () => pushChatMessage({ id: `sys-blocked-${Date.now()}`, playerId: 'system', playerName: 'System', message: 'Your message wasn’t sent — please keep it friendly.', timestamp: Date.now(), isSystem: true });

    const onError = (data: { message: string; code?: string; region?: 'eu' | 'us'; roomCode?: string }) => {
      // Self-heal: a cluster reboot / cross-worker split can leave the socket
      // bound to a worker that no longer knows this room ("Not in a room").
      // Re-fire session:reconnect to rebind instead of dead-ending on an error.
      const isNotInRoom = data.code === 'NOT_IN_ROOM' || data.message === 'Not in a room';
      if (isNotInRoom) {
        const sessionToken = sessionStorage.getItem('gameSessionToken');
        if (sessionToken) {
          void handleReconnection(sessionToken); // region-aware NOT_IN_ROOM recovery: re-pins wrong_region + dedupes (root-cause fix 2026-07-23)
          return;
        }
      }
      // Multi-region: a legacy pin-less streamer invite (?invite=<uuid>) can
      // land on the wrong region, which can't resolve it (tokens are in-memory
      // per instance) and can't name the owner. Retry the OTHER region once —
      // the retry URL carries a pin, so a second failure falls through to the
      // error (genuinely expired invite).
      if (data.code === 'INVALID_INVITE' && !hadUrlRegionPin()) {
        const lastInviteToken = sessionStorage.getItem('gb_lastInviteToken');
        if (lastInviteToken) {
          const other = getCachedRegion() === 'us' ? 'eu' : 'us';
          pinRegion(other);
          console.warn(`[useGameBuddiesClient] invite unknown here — retrying on ${other.toUpperCase()}`);
          window.location.href = `${window.location.pathname}?invite=${encodeURIComponent(lastInviteToken)}&gbRegion=${other}`;
          return;
        }
      }
      // Multi-region: this room lives on the OTHER regional server (a legacy
      // pin-less link landed us here). Pin the owning region and navigate with
      // the room code + pin — HomePage re-enters the join flow on the right
      // server. Navigation (not reload): HomePage already stripped the URL.
      if (data.code === 'WRONG_REGION' && (data.region === 'eu' || data.region === 'us') && data.roomCode) {
        const nowWR = Date.now();
        const lastWR = Number(sessionStorage.getItem('gb_wrongRegionReloadAt') || 0);
        if (nowWR - lastWR > 15000) {
          sessionStorage.setItem('gb_wrongRegionReloadAt', String(nowWR));
          pinRegion(data.region);
          console.warn(`[useGameBuddiesClient] room is on ${data.region.toUpperCase()} — redirecting with region pin`);
          window.location.href = `${window.location.pathname}?room=${encodeURIComponent(data.roomCode)}&gbRegion=${data.region}`;
          return;
        }
        // Throttled — fall through to showing the server's message.
      }
      setError(data.message);
    };

    const onKicked = (data: { message: string }) => {

      // CRITICAL: Clear ALL session storage to prevent F5 rejoin
      clearSession(); // Clear gamebuddies:session
      socketService.clearReconnectionData(); // Clear template_* keys
      sessionStorage.removeItem('gameSessionToken');

      // Show toast notification instead of alert
      setKickMessage(data.message);

      // Clear state
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
    socket.on('host:migrated', onHostMigrated);
    socket.on('room:player-list-update', onPlayerListUpdate);
    socket.on('room:settings-updated', onSettingsUpdated);
    socket.on('game:started', onGameStarted);
    socket.on('game:ended', onGameEnded);
    socket.on('game:restarted', onGameRestarted);
    socket.on('settings:updated', onSettingsUpdated);
    socket.on('chat:message', onChatMessage);
    socket.on('chat:blocked', onChatBlocked);
    socket.on('error', onError);
    socket.on('player:kicked', onKicked);

    cleanupGameEvents = options.registerGameEvents?.(socket, {
      setLobbyState,
      patchLobby,
      setMessages,
      setError,
    });
    };

    initSocket();

    return () => {
      mounted = false;
      clearAllTimeouts();
      if (socketRef) {
        socketRef.off('connect');
        socketRef.off('disconnect');
        socketRef.off('room:created');
        socketRef.off('room:joined');
        socketRef.off('room:player-joined');
        socketRef.off('room:player-left');
        socketRef.off('room:player-disconnected');
        socketRef.off('room:player-reconnected');
        socketRef.off('room:host-transferred');
        socketRef.off('host:migrated');
        socketRef.off('room:player-list-update');
        socketRef.off('room:settings-updated');
        socketRef.off('game:started');
        socketRef.off('game:ended');
        socketRef.off('game:restarted');
        socketRef.off('settings:updated');
        socketRef.off('chat:message');
        socketRef.off('chat:blocked');
        socketRef.off('error');
        socketRef.off('player:kicked');
      }

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

  const restartGame = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket && lobby) {
      socket.emit('game:restart', { roomCode: lobby.code });
    }
  }, [lobby]);

  const updateSettings = useCallback((settings: Record<string, any>) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('settings:update', settings);
    }
  }, []);

  const startGame = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket && lobby) {
      socket.emit('game:start', { roomCode: lobby.code });
    }
  }, [lobby]);

  return {
    lobby,
    messages,
    error,
    isConnected,
    socket: socketService.getSocket(),
    gameBuddiesSession,
    kickMessage,
    clearKickMessage: () => setKickMessage(null),
    createRoom,
    joinRoom,
    clearError: () => setError(''),
    patchLobby,
    setLobbyState,
    setMessages,
    restartGame,
    updateSettings,
    startGame,
  };
}

export default useGameBuddiesClient;
