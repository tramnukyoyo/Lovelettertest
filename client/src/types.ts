// Love Letter - Client Types
// Risk, deduction, and luck. Get your letter to the Princess!

// ============================================================================
// BASE TYPES
// ============================================================================

export type GameState =
  | 'LOBBY'
  | 'PLAYING'
  | 'ENDED';

export interface BasePlayer {
  socketId: string;
  name: string;
  connected: boolean;
  isHost: boolean;
  disconnectedAt?: number;
  premiumTier?: 'free' | 'monthly' | 'lifetime';
  avatarUrl?: string;
  id?: string; // Added to match server
}

export interface BaseSettings {
  minPlayers: number;
  maxPlayers: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface BaseLobby<TPlayer, TSettings, TGameData> {
  code: string;
  hostId: string;
  settings: TSettings;
  players: TPlayer[];
  state: GameState;
  gameData: TGameData | null;
  isGameBuddiesRoom: boolean;
  isStreamerMode?: boolean;
  hideRoomCode?: boolean;
  mySocketId: string;
  messages?: ChatMessage[];
}

// ============================================================================
// LOVE LETTER TYPES
// ============================================================================

export type CardType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 0 = Card Back

export interface LoveLetterPlayer extends BasePlayer {
  tokens: number;
  isEliminated: boolean;
  isImmune: boolean;
  isReady: boolean;
  discarded: CardType[];
  hand: CardType[];
  handCount: number;
}

export interface LoveLetterSettings extends BaseSettings {
  gameSpecific: {
    tokensToWin: number;
  };
}

export interface LoveLetterGameData {
  currentRound: number;
  currentTurn: string | null; // Player ID
  turnPhase: 'draw' | 'play';
  deckCount: number;
  faceUpCards: CardType[];
  roundWinner: string | null;
  winner: string | null;
}

export type LoveLetterLobby = BaseLobby<LoveLetterPlayer, LoveLetterSettings, LoveLetterGameData>;

// ============================================================================
// MAIN EXPORT
// ============================================================================

// We default to Love Letter for this client
export type Lobby = LoveLetterLobby;
export type Player = LoveLetterPlayer;
export type Settings = LoveLetterSettings;
export type GameData = LoveLetterGameData;

// ============================================================================
// SOCKET EVENT PAYLOAD TYPES
// ============================================================================

export interface SessionReconnectResponse {
  success: boolean;
  lobby?: Lobby;
  sessionToken?: string;
  error?: string;
}

export interface GameSyncResponse {
  success: boolean;
  room?: Lobby;
  error?: string;
}

export interface PlayerListUpdatePayload {
  players: Player[];
}

export interface PlayerJoinLeavePayload {
  playerId?: string;
  playerName?: string;
  players: Player[];
}

export interface HostTransferPayload {
  oldHostId: string;
  newHostId: string;
  oldHostName: string;
  newHostName: string;
  players: Player[];
}

export interface SettingsUpdatePayload {
  settings: Settings;
}

export interface GameEndedPayload {
  lobby?: Lobby;
  reason?: string;
  // rounds?: Round[]; // Removed legacy
}
