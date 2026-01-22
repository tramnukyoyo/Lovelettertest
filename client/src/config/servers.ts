export type Region = 'us' | 'eu';

// Hardcoded to unified-game-server - ignoring env vars that may point to wrong server
export const SERVERS: Record<Region, string> = {
  us: 'https://unified-game-server-us.onrender.com',
  eu: 'https://unified-game-server.onrender.com',
};

export const GAME_NAMESPACE = '/primesuspect';
