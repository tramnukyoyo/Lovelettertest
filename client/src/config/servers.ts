export type Region = 'us' | 'eu';

export const SERVERS: Record<Region, string> = {
  us: import.meta.env.VITE_BACKEND_URL_US || 'https://unified-game-server-us.onrender.com',
  eu: import.meta.env.VITE_BACKEND_URL || 'https://unified-game-server.onrender.com',
};

export const GAME_NAMESPACE = '/primesuspect';

/**
 * Discord Activity engine.io path. Inside Discord the iframe is served from
 * `<app_id>.discordsays.com`; the game socket must route through the proxy under
 * `/.proxy/gs` (Discord strips `/gs` → shared gameserver). The `/primesuspect` namespace
 * stays in the io() URL; this is only the engine.io transport path.
 */
export const DISCORD_SOCKET_PATH = '/.proxy/gs/socket.io';

export function isCapacitor(): boolean {
  return window.location.origin === 'https://localhost';
}

export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}
