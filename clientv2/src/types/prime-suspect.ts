/**
 * Prime Suspect (Heart's Gambit) Game Types
 * Mirrors the server serialization shape from games/hearts-gambit/plugin.ts.
 *
 * NOTE: a handful of fields (isBigScreen, isSpectator, score, timeRemaining)
 * are kept OPTIONAL purely so the shared GameShell base (App.tsx, video
 * filmstrip, presence helpers) type-checks. Prime Suspect's own game logic
 * ignores them.
 */

import type { BasePlayer, BaseSettings, BaseLobby, ChatMessage } from './base';

// ============================================================================
// GAME STATE — Prime Suspect uses a simple UPPERCASE machine
// ============================================================================

export type PrimeSuspectState = 'LOBBY' | 'PLAYING' | 'ENDED';

// ============================================================================
// CARDS
// ============================================================================

export type CardType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 0 = Card Back

// ============================================================================
// PASS & PLAY
// ============================================================================

export interface PassPlayState {
  enabled: boolean;
  currentPlayerIndex: number;
  revealed: boolean;
  turnOrder: string[];
  phase: 'waiting' | 'revealed' | 'acting';
}

// ============================================================================
// PLAYER
// ============================================================================

export interface PrimeSuspectPlayer extends BasePlayer {
  tokens: number;
  isEliminated: boolean;
  isImmune: boolean;
  isReady: boolean;
  discarded: CardType[];
  hand: CardType[];
  handCount: number;
  isBot?: boolean;
  isSpectator?: boolean;
  isPassPlayPlayer?: boolean;
  /** Shared-shell compatibility (unused by Prime Suspect logic). */
  isBigScreen?: boolean;
  score?: number;
}

// ============================================================================
// SETTINGS
// ============================================================================

export interface PrimeSuspectSettings extends BaseSettings {
  gameType?: 'online' | 'pass-play';
  gameSpecific: {
    tokensToWin: number;
  };
}

// ============================================================================
// GAME DATA
// ============================================================================

export interface PrimeSuspectDiscardEntry {
  card: CardType;
  playerId: string;
  playerName: string;
  timestamp: number;
  round: number;
  kind: 'play' | 'forced-discard';
}

export interface PrimeSuspectGameData {
  currentRound: number;
  currentTurn: string | null; // Player ID
  turnPhase: 'draw' | 'play';
  deckCount: number;
  faceUpCards: CardType[];
  discardPile: PrimeSuspectDiscardEntry[];
  roundWinner: string | null;
  winner: string | null;
  /** Shared-shell compatibility (timer ticks + broadcast HUD from base App). */
  timeRemaining?: number;
  totalRounds?: number;
}

// ============================================================================
// LOBBY
// ============================================================================

export interface PrimeSuspectLobby
  extends BaseLobby<PrimeSuspectPlayer, PrimeSuspectSettings, PrimeSuspectGameData> {
  state: PrimeSuspectState;
  passPlay?: PassPlayState;
  messages?: ChatMessage[];
}

// ============================================================================
// CONVENIENCE EXPORTS (default game for this client)
// ============================================================================

export type Lobby = PrimeSuspectLobby;
export type Player = PrimeSuspectPlayer;
export type Settings = PrimeSuspectSettings;
export type GameData = PrimeSuspectGameData;

// ============================================================================
// SOCKET EVENT PAYLOAD TYPES (carried over from old client)
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
