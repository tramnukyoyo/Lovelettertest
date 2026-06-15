/**
 * Base Types - Shared across all GameBuddies games
 * These types are used by the template infrastructure
 */

// ============================================================================
// GAME STATE
// ============================================================================

export type GamePhase = 'lobby' | 'playing' | 'ended' | string;

// ============================================================================
// PLAYER TYPES
// ============================================================================

export interface BasePlayer {
  socketId: string;
  name: string;
  connected: boolean;
  isHost: boolean;
  disconnectedAt?: number;
  premiumTier?: 'free' | 'premium' | 'pro' | 'monthly' | 'lifetime';
  avatarUrl?: string;
  id?: string;
  isPassPlayPlayer?: boolean;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface BaseSettings {
  minPlayers: number;
  maxPlayers: number;
}

// ============================================================================
// TEAM TYPES
// ============================================================================

export interface Team {
  id: string;
  name: string;
  color: string;
  playerIds: string[];
  score?: number;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

// ============================================================================
// LOBBY TYPES
// ============================================================================

export interface BaseLobby<TPlayer, TSettings, TGameData> {
  code: string;
  hostId: string;
  settings: TSettings;
  players: TPlayer[];
  state: GamePhase;
  gameData: TGameData | null;
  isGameBuddiesRoom: boolean;
  isStreamerMode?: boolean;
  hideRoomCode?: boolean;
  mySocketId: string;
  messages?: ChatMessage[];
}

// ============================================================================
// SOCKET EVENT PAYLOAD TYPES
// ============================================================================

export interface RoomCreatedPayload<TLobby> {
  lobby: TLobby;
  sessionToken: string;
}

export interface RoomJoinedPayload<TLobby> {
  lobby: TLobby;
  sessionToken: string;
}

export interface PlayerJoinedPayload<TPlayer> {
  player: TPlayer;
  players: TPlayer[];
}

export interface PlayerLeftPayload<TPlayer> {
  playerId: string;
  playerName?: string;
  players: TPlayer[];
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  playerName?: string;
}

export interface HostTransferPayload<TPlayer> {
  oldHostId: string;
  newHostId: string;
  oldHostName: string;
  newHostName: string;
  players: TPlayer[];
}

export interface LobbyUpdatePayload<TLobby> {
  lobby: TLobby;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}
