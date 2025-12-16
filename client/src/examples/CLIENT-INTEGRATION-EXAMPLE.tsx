/**
 * Client Integration Example for GameBuddies Unified Server
 *
 * This file shows how to integrate the GamebuddiesTemplate client
 * with the unified game server instead of the standalone server.
 *
 * Key changes:
 * 1. Socket connects to namespace (e.g., /your-game)
 * 2. Event names updated to match unified server
 * 3. State comes from roomStateUpdated event
 * 4. Game-specific UI components
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import socketService from '../services/socketService';
import type { Lobby, ChatMessage } from '../types';

// ============================================================================
// SOCKET SERVICE CONFIGURATION
// ============================================================================

/**
 * Update your socketService.ts to connect to the namespace:
 *
 * const NAMESPACE = '/your-game'; // Your game's namespace
 *
 * connect(): Socket {
 *   const SERVER_URL = getServerUrl();
 *   this.socket = io(`${SERVER_URL}${NAMESPACE}`, {
 *     // ... options
 *   });
 * }
 */

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export function UnifiedServerApp() {
  // State management
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [_sessionToken, setSessionToken] = useState<string | null>(null);

  // Refs for cleanup
  const socketRef = useRef<Socket | null>(null);
  const isReconnecting = useRef(false);

  // ============================================================================
  // SOCKET EVENT HANDLERS
  // ============================================================================

  /**
   * Setup socket event listeners
   * These replace the template's original events with unified server events
   */
  const setupSocketListeners = useCallback((socket: Socket) => {
    // ----------------------------------------
    // Connection Events
    // ----------------------------------------

    socket.on('connect', () => {
      console.log('[UnifiedApp] Socket connected');
      setIsConnected(true);

      // Attempt reconnection if we have a session token
      const storedToken = sessionStorage.getItem('gameSessionToken');
      if (storedToken && !isReconnecting.current) {
        console.log('[UnifiedApp] Attempting reconnection with session token');
        attemptReconnection(socket, storedToken);
      }
    });

    socket.on('disconnect', () => {
      console.log('[UnifiedApp] Socket disconnected');
      setIsConnected(false);
    });

    // ----------------------------------------
    // Room Events (from unified server)
    // ----------------------------------------

    // CHANGED: lobby:created → room:created
    socket.on('room:created', (data: { room: any; sessionToken: string }) => {
      console.log('[UnifiedApp] Room created:', data.room.code);
      handleRoomUpdate(data.room);
      handleSessionToken(data.sessionToken);
    });

    // CHANGED: lobby:joined → room:joined
    socket.on('room:joined', (data: { room: any; player: any; sessionToken: string }) => {
      console.log('[UnifiedApp] Joined room:', data.room.code);
      handleRoomUpdate(data.room);
      handleSessionToken(data.sessionToken);
    });

    // NEW: Single state update event instead of multiple
    socket.on('roomStateUpdated', (room: any) => {
      console.log('[UnifiedApp] Room state updated');
      handleRoomUpdate(room);
    });

    // ----------------------------------------
    // Game Events
    // ----------------------------------------

    socket.on('game:started', (data: any) => {
      console.log('[UnifiedApp] Game started:', data);
      setError('');
      // Update UI to show game started
    });

    socket.on('game:ended', (data: { winner: any; finalScores: any[] }) => {
      console.log('[UnifiedApp] Game ended. Winner:', data.winner);
      // Show game over screen
    });

    socket.on('gamePhaseChanged', (phase: string) => {
      console.log('[UnifiedApp] Game phase changed:', phase);
      // Update UI based on phase
    });

    // ----------------------------------------
    // Chat Events
    // ----------------------------------------

    socket.on('chat:message', (message: ChatMessage) => {
      console.log('[UnifiedApp] Chat message:', message);
      setMessages(prev => [...prev, message].slice(-100));
    });

    // ----------------------------------------
    // Error Handling
    // ----------------------------------------

    socket.on('error', (data: { message: string }) => {
      console.error('[UnifiedApp] Error:', data.message);
      setError(data.message);
    });

    socket.on('player:kicked', (data: { message: string }) => {
      console.log('[UnifiedApp] Kicked:', data.message);
      alert(data.message);
      setLobby(null);
      setError('');
    });

    // ----------------------------------------
    // Custom Game Events - Add your game-specific events here
    // ----------------------------------------

    socket.on('timer:update', (data: { timeRemaining: number }) => {
      // Update timer display
      updateGameTimer(data.timeRemaining);
    });

    socket.on('turn:changed', (data: { currentPlayer: string }) => {
      // Update turn indicator
      console.log('[UnifiedApp] Turn changed to:', data.currentPlayer);
    });

    socket.on('action:result', (data: { success: boolean; points: number }) => {
      // Show action feedback
      console.log('[UnifiedApp] Action result:', data);
    });

    // Add more game-specific events as needed

  }, []);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Handle room state updates from server
   */
  const handleRoomUpdate = (room: any) => {
    setLobby(room);
    setMessages(room.messages || []);
    setError('');
  };

  /**
   * Store session token for reconnection
   */
  const handleSessionToken = (token: string) => {
    setSessionToken(token);
    sessionStorage.setItem('gameSessionToken', token);
    console.log('[UnifiedApp] Session token stored');
  };

  /**
   * Attempt to reconnect using session token
   */
  const attemptReconnection = (socket: Socket, token: string) => {
    isReconnecting.current = true;

    socket.emit('session:reconnect', { sessionToken: token }, (response: any) => {
      isReconnecting.current = false;

      if (response.success) {
        console.log('[UnifiedApp] Reconnection successful');
        handleRoomUpdate(response.room);
        handleSessionToken(response.sessionToken);

        // Sync full game state
        setTimeout(() => {
          socket.emit('game:sync-state', { roomCode: response.room.code }, (syncResponse: any) => {
            if (syncResponse.success) {
              console.log('[UnifiedApp] State synced');
              handleRoomUpdate(syncResponse.room);
            }
          });
        }, 100);
      } else {
        console.error('[UnifiedApp] Reconnection failed:', response.error);
        sessionStorage.removeItem('gameSessionToken');
        setSessionToken(null);
      }
    });
  };

  /**
   * Update game timer display
   */
  const updateGameTimer = (timeRemaining: number) => {
    // Update your timer component
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    console.log(`[UnifiedApp] Timer: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  };

  // ============================================================================
  // USER ACTIONS
  // ============================================================================

  /**
   * Create a new room
   */
  const handleCreateRoom = (playerName: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    console.log('[UnifiedApp] Creating room...');

    socket.emit('room:create', {
      playerName,
      // Optional: GameBuddies integration
      // playerId: gameBuddiesSession?.playerId,
      // roomCode: gameBuddiesSession?.roomCode,
    });
  };

  /**
   * Join an existing room
   */
  const handleJoinRoom = (roomCode: string, playerName: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    console.log('[UnifiedApp] Joining room:', roomCode);

    socket.emit('room:join', {
      roomCode: roomCode.toUpperCase(),
      playerName,
      // Optional: GameBuddies integration
      // playerId: gameBuddiesSession?.playerId,
    });
  };

  /**
   * Start the game (host only)
   */
  const handleStartGame = () => {
    const socket = socketRef.current;
    if (!socket || !lobby) return;

    console.log('[UnifiedApp] Starting game...');
    socket.emit('game:start', { roomCode: lobby.code });
  };

  /**
   * Submit a game action
   */
  const handleGameAction = (action: string) => {
    const socket = socketRef.current;
    if (!socket || !lobby) return;

    console.log('[UnifiedApp] Sending game action:', action);
    socket.emit('game:action', {
      roomCode: lobby.code,
      action
    });
  };

  /**
   * Send a chat message
   */
  const handleSendMessage = (message: string) => {
    const socket = socketRef.current;
    if (!socket || !lobby) return;

    socket.emit('chat:message', {
      roomCode: lobby.code,
      message
    });
  };

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    // Connect to socket
    const socket = socketService.connect();
    socketRef.current = socket;

    // Setup listeners
    setupSocketListeners(socket);

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('roomStateUpdated');
      socket.off('game:started');
      socket.off('game:ended');
      socket.off('gamePhaseChanged');
      socket.off('chat:message');
      socket.off('error');
      socket.off('player:kicked');
      // Remove custom game events
      socket.off('timer:update');
      socket.off('turn:changed');
      socket.off('action:result');

      socketService.disconnect();
    };
  }, [setupSocketListeners]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isConnected) {
    return <ConnectionScreen />;
  }

  if (!lobby) {
    return (
      <HomeScreen
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        error={error}
      />
    );
  }

  // Render based on game state
  switch (lobby.state) {
    case 'LOBBY_WAITING':
      return (
        <LobbyScreen
          lobby={lobby}
          onStartGame={handleStartGame}
          onSendMessage={handleSendMessage}
          messages={messages}
          error={error}
        />
      );

    case 'WORD_INPUT':
    case 'REVEAL':
    case 'VICTORY':
      return (
        <GameScreen
          lobby={lobby}
          onGameAction={handleGameAction}
          onSendMessage={handleSendMessage}
          messages={messages}
          error={error}
        />
      );

    case 'GAME_OVER':
      return (
        <GameOverScreen
          lobby={lobby}
          onPlayAgain={() => {
            socketRef.current?.emit('game:restart', { roomCode: lobby.code });
          }}
          onReturnToLobby={() => {
            socketRef.current?.emit('game:restart', { roomCode: lobby.code });
          }}
        />
      );

    default:
      return <div>Unknown game state: {lobby.state}</div>;
  }
}

// ============================================================================
// SCREEN COMPONENTS
// ============================================================================

/**
 * Connection Screen - Shown while connecting
 */
function ConnectionScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold">Connecting to server...</h2>
        <p className="text-gray-500 mt-2">Please wait</p>
      </div>
    </div>
  );
}

/**
 * Home Screen - Create or join room
 */
interface HomeScreenProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  error: string;
}

function HomeScreen({ onCreateRoom, onJoinRoom, error }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (mode === 'create') {
      onCreateRoom(playerName);
    } else if (mode === 'join' && roomCode.trim()) {
      onJoinRoom(roomCode, playerName);
    }
  };

  return (
    <div className="container mx-auto max-w-md mt-20 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Your Game Name</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
          maxLength={20}
        />

        {mode === 'join' && (
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 border rounded-lg uppercase"
            maxLength={6}
          />
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            onClick={() => setMode('create')}
            className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary-dark"
          >
            Create Room
          </button>
          <button
            type="submit"
            onClick={() => setMode('join')}
            className="flex-1 bg-secondary text-white py-2 rounded-lg hover:bg-secondary-dark"
          >
            Join Room
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Lobby Screen - Waiting for players
 */
interface LobbyScreenProps {
  lobby: any;
  onStartGame: () => void;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  error: string;
}

function LobbyScreen({ lobby, onStartGame, onSendMessage, messages, error }: LobbyScreenProps) {
  const isHost = lobby.mySocketId === lobby.players.find((p: any) => p.isHost)?.socketId;

  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Room Code: {lobby.code}</h1>
        <p className="text-gray-500">Share this code with other players</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Players List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Players ({lobby.players.length}/{lobby.settings.maxPlayers})
          </h2>
          <ul className="space-y-2">
            {lobby.players.map((player: any) => (
              <li
                key={player.socketId}
                className={`flex justify-between items-center p-2 rounded ${
                  player.connected ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {player.name}
                  {player.isHost && <span className="text-xs bg-primary text-white px-2 py-1 rounded">HOST</span>}
                  {!player.connected && <span className="text-xs text-gray-500">(Disconnected)</span>}
                </span>
                {player.isReady && <span className="text-green-500">✓ Ready</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Min Players:</span>
              <span>{lobby.settings.minPlayers}</span>
            </div>
            <div className="flex justify-between">
              <span>Max Players:</span>
              <span>{lobby.settings.maxPlayers}</span>
            </div>
            {/* Add your game-specific settings here */}
            {lobby.settings.gameSpecific && (
              <>
                <div className="flex justify-between">
                  <span>Rounds:</span>
                  <span>{lobby.settings.gameSpecific.roundsPerGame || 3}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time per Round:</span>
                  <span>{lobby.settings.gameSpecific.timePerRound || 60}s</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Start Game Button */}
      {isHost && (
        <div className="mt-8 text-center">
          <button
            onClick={onStartGame}
            disabled={lobby.players.length < lobby.settings.minPlayers}
            className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-semibold disabled:bg-gray-300"
          >
            Start Game
          </button>
          {lobby.players.length < lobby.settings.minPlayers && (
            <p className="text-sm text-gray-500 mt-2">
              Need at least {lobby.settings.minPlayers} players to start
            </p>
          )}
        </div>
      )}

      {/* Simple Chat */}
      <ChatComponent messages={messages} onSendMessage={onSendMessage} />
    </div>
  );
}

/**
 * Game Screen - Main game UI
 */
interface GameScreenProps {
  lobby: any;
  onGameAction: (action: string) => void;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  error: string;
}

function GameScreen({ lobby, onGameAction, onSendMessage, messages, error }: GameScreenProps) {
  // Your game UI goes here
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Game in Progress</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Game Stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{lobby.gameData?.currentRound || 0}</div>
            <div className="text-gray-500">Round</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{lobby.gameData?.timeRemaining || 0}s</div>
            <div className="text-gray-500">Time</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{lobby.players.length}</div>
            <div className="text-gray-500">Players</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {lobby.players.find((p: any) => p.socketId === lobby.mySocketId)?.score || 0}
            </div>
            <div className="text-gray-500">Your Score</div>
          </div>
        </div>
      </div>

      {/* Game Content - Replace with your game UI */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Game Area</h2>

        {/* Example game actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onGameAction('action1')}
            className="bg-primary text-white px-6 py-2 rounded-lg"
          >
            Action 1
          </button>
          <button
            onClick={() => onGameAction('action2')}
            className="bg-secondary text-white px-6 py-2 rounded-lg"
          >
            Action 2
          </button>
          <button
            onClick={() => onGameAction('action3')}
            className="bg-accent text-white px-6 py-2 rounded-lg"
          >
            Action 3
          </button>
        </div>

        {/* Add your game-specific UI here */}
      </div>

      {/* Players & Scores */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Players</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {lobby.players.map((player: any) => (
            <div
              key={player.socketId}
              className={`text-center p-3 rounded ${
                player.socketId === lobby.gameData?.currentTurn ? 'bg-primary text-white' : 'bg-gray-100'
              }`}
            >
              <div className="font-semibold">{player.name}</div>
              <div className="text-2xl">{player.score || 0}</div>
              {!player.connected && <div className="text-xs">(Disconnected)</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <ChatComponent messages={messages} onSendMessage={onSendMessage} />
    </div>
  );
}

/**
 * Game Over Screen
 */
interface GameOverScreenProps {
  lobby: any;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

function GameOverScreen({ lobby, onPlayAgain, onReturnToLobby }: GameOverScreenProps) {
  const sortedPlayers = [...lobby.players].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
  const winner = sortedPlayers[0];

  return (
    <div className="container mx-auto max-w-md mt-20 p-6 text-center">
      <h1 className="text-4xl font-bold mb-8">Game Over!</h1>

      <div className="bg-yellow-100 rounded-lg p-6 mb-6">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold">{winner?.name} Wins!</h2>
        <div className="text-3xl mt-2">{winner?.score || 0} points</div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Final Scores</h3>
        <ol className="space-y-2">
          {sortedPlayers.map((player: any, index: number) => (
            <li
              key={player.socketId}
              className={`flex justify-between p-2 rounded ${
                index === 0 ? 'bg-yellow-50' : 'bg-gray-50'
              }`}
            >
              <span>
                {index + 1}. {player.name}
              </span>
              <span className="font-bold">{player.score || 0}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onPlayAgain}
          className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold"
        >
          Play Again
        </button>
        <button
          onClick={onReturnToLobby}
          className="flex-1 bg-secondary text-white py-3 rounded-lg font-semibold"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}

/**
 * Chat Component - Reusable chat UI
 */
interface ChatComponentProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

function ChatComponent({ messages, onSendMessage }: ChatComponentProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Chat</h3>
      <div className="h-48 overflow-y-auto mb-3 p-3 bg-gray-50 rounded">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <span className="font-semibold">{msg.playerName}:</span>{' '}
            <span>{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded-lg"
          maxLength={200}
        />
        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default UnifiedServerApp;