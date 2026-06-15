/**
 * Logger Utility
 * Provides consistent logging with game prefix
 */

const GAME_PREFIX = '[Template]';

export const logger = {
  log: (...args: unknown[]) => {
    console.log(GAME_PREFIX, ...args);
  },

  info: (...args: unknown[]) => {
    console.info(GAME_PREFIX, ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn(GAME_PREFIX, ...args);
  },

  error: (...args: unknown[]) => {
    console.error(GAME_PREFIX, ...args);
  },

  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug(GAME_PREFIX, ...args);
    }
  },
};

export default logger;
