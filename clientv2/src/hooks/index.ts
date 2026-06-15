/**
 * Hooks Index
 *
 * Central export for all custom hooks.
 */

// Main game client hook
export { useGameBuddiesClient } from './useGameBuddiesClient';
export type {
  UseGameBuddiesClientOptions,
  UseGameBuddiesClientResult,
  RegisterGameEventsHelpers,
} from './useGameBuddiesClient';

// Device detection hooks
export { useIsMobile, useDeviceType, useOrientation, useHasTouch } from './useIsMobile';

// Video hooks
export { useVideoKeyboardShortcuts } from './useVideoKeyboardShortcuts';
export {
  useVideoPreferences,
  getPopupLayoutPreference,
  savePopupLayoutPreference,
} from './useVideoPreferences';

// Mobile keyboard hook
export { useKeyboardHeight } from './useKeyboardHeight';

// Audio hooks
export { useTypewriterSound } from './useTypewriterSound';

// Game logic hooks
export { useTimer } from './useTimer';
export type { UseTimerOptions, UseTimerResult } from './useTimer';

export { useGameRounds } from './useGameRounds';
export type { UseGameRoundsOptions, UseGameRoundsResult } from './useGameRounds';

// usePlayerReady and usePassPlay removed (template-specific)
// useMobileNavigation and useDesktopScale removed (dead code — pages manage
// drawer state directly; MobileDrawer owns the body-scroll lock)
