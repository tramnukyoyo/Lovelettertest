/**
 * Wake Lock Service
 *
 * Manages Screen Wake Lock API to prevent screen from dimming during gameplay.
 * Handles visibility change events to reacquire lock when tab becomes visible.
 *
 * Browser support: Chrome 84+, Firefox 126+, Safari 16.4+, Edge 84+
 */

export class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported: boolean;
  private boundVisibilityHandler: (() => void) | null = null;

  constructor() {
    this.isSupported = 'wakeLock' in navigator;
  }

  /**
   * Acquire wake lock to prevent screen from sleeping
   * Returns true if successful, false if not supported or failed
   */
  async acquire(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('[Video/wake] Wake Lock API not supported');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('[Video/wake] Wake lock acquired');

      // Set up visibility change handler for reacquisition
      if (!this.boundVisibilityHandler) {
        this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
      }

      return true;
    } catch (err) {
      console.warn('[Video/wake] Failed to acquire:', err);
      return false;
    }
  }

  /**
   * Handle visibility change - reacquire wake lock when tab becomes visible
   * Critical pattern: wake lock is auto-released when tab is hidden
   */
  private async handleVisibilityChange(): Promise<void> {
    if (this.wakeLock !== null && document.visibilityState === 'visible') {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[Video/wake] Wake lock reacquired after visibility change');
      } catch (err) {
        console.warn('[Video/wake] Failed to reacquire:', err);
      }
    }
  }

  /**
   * Release wake lock and cleanup event listeners
   */
  release(): void {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('[Video/wake] Wake lock released');
    }

    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
  }
}
