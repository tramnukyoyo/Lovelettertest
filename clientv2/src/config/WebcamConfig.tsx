/**
 * Universal Webcam Integration Config Interface
 *
 * This interface abstracts away game-specific state management,
 * allowing the webcam system to work with any game.
 */

import React, { createContext, useContext } from 'react';
import { Socket } from 'socket.io-client';

// TODO: Import your game's language type
type Language = 'en' | 'de' | 'pt-BR' | 'pt-PT' | 'es' | 'zh-Hant';

/**
 * Player data structure for webcam display
 */
export interface WebcamPlayer {
  id: string;
  name: string;
  lives?: number;
  isEliminated?: boolean;
  score?: number;
  team?: string;
  [key: string]: unknown;
}

/**
 * Core configuration interface for webcam integration
 */
export interface WebcamConfig {
  // ========================================
  // REQUIRED: Core Video Chat Functionality
  // ========================================

  /** Get the Socket.io connection instance */
  getSocket: () => Socket;

  /** Get the current user's ID */
  getUserId: () => string | null;

  /** Get the current room/game/session code */
  getRoomCode: () => string | null;

  // ========================================
  // OPTIONAL: Enhanced Functionality
  // ========================================

  /** Get the current user's role (e.g., 'player', 'gamemaster', 'host', 'spectator') */
  getUserRole?: () => string;

  /** Get list of players in the room */
  getPlayers?: () => WebcamPlayer[];

  /** Get the gamemaster/host information */
  getGamemaster?: () => { id: string; name: string } | null;

  /** Get current language for i18n */
  getLanguage?: () => Language;

  /** Callback when media state changes */
  onMediaStateChange?: (isMicOn: boolean) => void;

  // ========================================
  // OPTIONAL: Game-Specific UI Features
  // ========================================

  /** Whether to show lives/hearts display */
  showLives?: boolean;

  /** Get number of lives for a specific player */
  getLivesForPlayer?: (playerId: string) => number;

  /** Whether to show voting buttons */
  showVoting?: boolean;

  /** Whether user has already voted */
  getHasVoted?: () => boolean;

  /** Callback when user votes for a player */
  onVote?: (playerId: string) => void;

  /** Check if currently in voting phase */
  isVotingPhase?: () => boolean;

  /** Whether to show turn indicators */
  showTurnIndicators?: boolean;

  /** Get the player who is currently taking their turn */
  getCurrentTurnPlayer?: () => string | null;

  /** Get the player who will take the next turn */
  getNextTurnPlayer?: () => string | null;

  /** Get the current game state */
  getGameState?: () => string;

  // ========================================
  // OPTIONAL: UI Customization
  // ========================================

  /** Custom CSS class for main container */
  containerClassName?: string;

  /** Whether to enable compact mode */
  compactMode?: boolean;

  /** Maximum number of video feeds to show */
  maxVideoFeeds?: number;

  /** Custom player name formatter */
  formatPlayerName?: (player: WebcamPlayer) => string;
}

/**
 * Create a webcam config with default values
 */
export function createWebcamConfig(
  config: Partial<WebcamConfig> & Required<Pick<WebcamConfig, 'getSocket' | 'getUserId' | 'getRoomCode'>>
): WebcamConfig {
  return {
    getSocket: config.getSocket,
    getUserId: config.getUserId,
    getRoomCode: config.getRoomCode,
    getUserRole: config.getUserRole || (() => 'player'),
    getPlayers: config.getPlayers || (() => []),
    getGamemaster: config.getGamemaster || (() => null),
    getLanguage: config.getLanguage || (() => 'en'),
    onMediaStateChange: config.onMediaStateChange || (() => {}),
    showLives: config.showLives ?? false,
    getLivesForPlayer: config.getLivesForPlayer || (() => 3),
    showVoting: config.showVoting ?? false,
    getHasVoted: config.getHasVoted || (() => false),
    onVote: config.onVote || (() => {}),
    isVotingPhase: config.isVotingPhase || (() => false),
    showTurnIndicators: config.showTurnIndicators ?? false,
    getCurrentTurnPlayer: config.getCurrentTurnPlayer || (() => null),
    getNextTurnPlayer: config.getNextTurnPlayer || (() => null),
    getGameState: config.getGameState || (() => 'playing'),
    containerClassName: config.containerClassName || '',
    compactMode: config.compactMode ?? false,
    maxVideoFeeds: config.maxVideoFeeds ?? Infinity,
    formatPlayerName: config.formatPlayerName || ((player) => player.name),
  };
}

/**
 * Context for providing config to components
 */
export const WebcamConfigContext = createContext<WebcamConfig | null>(null);

/**
 * Hook to access webcam config in components
 */
export function useWebcamConfig(): WebcamConfig {
  const config = useContext(WebcamConfigContext);
  if (!config) {
    throw new Error('useWebcamConfig must be used within WebcamConfigProvider');
  }
  return config;
}

/**
 * Provider component to inject config
 */
export interface WebcamConfigProviderProps {
  config: WebcamConfig;
  children: React.ReactNode;
}

export function WebcamConfigProvider({ config, children }: WebcamConfigProviderProps) {
  return (
    <WebcamConfigContext.Provider value={config}>
      {children}
    </WebcamConfigContext.Provider>
  );
}
