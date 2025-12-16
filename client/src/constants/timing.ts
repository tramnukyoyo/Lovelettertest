/**
 * Timing constants used throughout the ThinkAlike client
 * Centralizing magic numbers for maintainability and consistency
 */

// ============================================================================
// COUNTDOWN OVERLAY TIMING
// ============================================================================
/** Duration to show each countdown number (3, 2, 1) in milliseconds */
export const COUNTDOWN_STEP_DURATION_MS = 1000;
/** Duration to show "GO!" in milliseconds */
export const COUNTDOWN_GO_DURATION_MS = 500;
/** Total countdown duration before game starts (3 seconds countdown + 0.5s GO) */
export const COUNTDOWN_TOTAL_DURATION_MS = 3500;

// Pre-calculated countdown timeline
export const COUNTDOWN_TIMINGS = [
  { number: 3, delay: 0 },
  { number: 2, delay: COUNTDOWN_STEP_DURATION_MS },
  { number: 1, delay: COUNTDOWN_STEP_DURATION_MS * 2 },
  { number: 'GO!', delay: COUNTDOWN_STEP_DURATION_MS * 3 },
] as const;

// ============================================================================
// ANIMATION TIMING
// ============================================================================
/** Delay before animations start (allows for state to settle) */
export const ANIMATION_MOUNT_DELAY_MS = 100;

// ============================================================================
// INPUT TIMING
// ============================================================================
/** Time remaining that triggers low-time warning (red timer) */
export const LOW_TIME_WARNING_THRESHOLD_SECONDS = 10;
/** Maximum word length for text input */
export const MAX_WORD_LENGTH = 50;
