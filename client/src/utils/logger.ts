/**
 * Environment-aware logger utility
 *
 * Logging is enabled in development mode (npm run dev) or when VITE_DEBUG=true
 * In production builds, only errors are logged for visibility.
 *
 * Usage: import { logger } from '../utils/logger';
 *        logger.log('[ComponentName]', 'message', data);
 */
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

export const logger = {
  /** Debug logging - only in development */
  log: (...args: unknown[]) => {
    if (DEBUG) console.log(...args);
  },
  /** Error logging - always visible (production issues need visibility) */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  /** Warning logging - only in development */
  warn: (...args: unknown[]) => {
    if (DEBUG) console.warn(...args);
  },
  /** Info logging - only in development */
  info: (...args: unknown[]) => {
    if (DEBUG) console.info(...args);
  },
  /** Debug flag for conditional logging blocks */
  isDebug: DEBUG,
};