/**
 * Haptic Feedback Utility
 *
 * Provides vibration feedback for mobile devices using the Vibration API.
 * Gracefully degrades on unsupported platforms.
 *
 * Browser support: Chrome 32+, Firefox 16+, Android Browser 4.4+
 * Note: Requires user activation (must be called in response to user interaction)
 */

const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const hapticFeedback = {
  /**
   * Short pulse for button press (50ms)
   * Use for: record start, button taps
   */
  tap(): void {
    if (!isSupported) return;
    try {
      navigator.vibrate(50);
    } catch (err) {
      console.warn('[HapticFeedback] Failed to vibrate:', err);
    }
  },

  /**
   * Double pulse for important actions (50ms, 30ms pause, 50ms)
   * Use for: record stop, important confirmations
   */
  doubleTap(): void {
    if (!isSupported) return;
    try {
      navigator.vibrate([50, 30, 50]);
    } catch (err) {
      console.warn('[HapticFeedback] Failed to vibrate:', err);
    }
  },

  /**
   * Triple pulse for success/completion (100ms each, 30ms pauses)
   * Use for: successful submission, game completion
   */
  success(): void {
    if (!isSupported) return;
    try {
      navigator.vibrate([100, 30, 100, 30, 100]);
    } catch (err) {
      console.warn('[HapticFeedback] Failed to vibrate:', err);
    }
  },

  /**
   * Cancel any ongoing vibration
   */
  cancel(): void {
    if (!isSupported) return;
    try {
      navigator.vibrate(0);
    } catch (err) {
      console.warn('[HapticFeedback] Failed to cancel vibration:', err);
    }
  }
};
