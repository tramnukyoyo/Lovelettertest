/**
 * Centralized storage key constants.
 * Prevents typos and makes it easy to find all storage usage.
 */
export const STORAGE_KEYS = {
  SESSION: {
    ROOM_CODE: 'gb_roomCode',
    PLAYER_NAME: 'gb_playerName',
    SESSION_TOKEN: 'gb_sessionToken',
  },
} as const;
