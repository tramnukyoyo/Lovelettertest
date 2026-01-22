export type Region = 'us' | 'eu';

export const SERVERS: Record<Region, string> = {
  us: import.meta.env.VITE_BACKEND_URL_US || 'https://unified-game-server-us.onrender.com',
  eu: import.meta.env.VITE_BACKEND_URL || 'https://unified-game-server.onrender.com',
};

export const GAME_NAMESPACE = '/primesuspect';
