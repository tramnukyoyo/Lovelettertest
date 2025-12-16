/**
 * Background Music Manager for ThinkAlike
 *
 * Manages looping background music playback.
 * Music plays during lobby and gameplay states and respects global volume/mute settings.
 */

class BackgroundMusicManager {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3; // Default 30% volume for background music

  constructor() {
    this.loadMusic();
  }

  /**
   * Load background music file
   */
  private loadMusic() {
    try {
      const audio = new Audio(import.meta.env.BASE_URL + 'music/background.mp3');
      audio.loop = true; // Enable looping
      audio.volume = this.volume;
      this.audio = audio;
      console.log('[BackgroundMusic] Background music loaded');
    } catch (error) {
      console.warn('[BackgroundMusic] Failed to load background music:', error);
    }
  }

  /**
   * Start playing background music
   */
  play() {
    if (!this.enabled || !this.audio) return;

    // Only play if not already playing
    if (this.audio.paused) {
      this.audio.play().catch(error => {
        console.warn('[BackgroundMusic] Failed to play background music:', error);
      });
    }
  }

  /**
   * Stop playing background music
   */
  stop() {
    if (!this.audio) return;

    this.audio.pause();
    this.audio.currentTime = 0; // Reset to beginning
  }

  /**
   * Pause without resetting position
   */
  pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  /**
   * Resume from pause
   */
  resume() {
    if (!this.enabled || !this.audio) return;

    if (this.audio.paused) {
      this.audio.play().catch(error => {
        console.warn('[BackgroundMusic] Failed to resume background music:', error);
      });
    }
  }

  /**
   * Set volume for background music (0.0 to 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Enable or disable background music
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!this.audio) return;

    if (enabled) {
      // Resume if music should be playing
      if (!this.audio.paused) {
        return; // Already playing
      }
    } else {
      // Pause if enabled is false
      this.audio.pause();
    }
  }

  /**
   * Check if music is currently playing
   */
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  /**
   * Get current volume (0.0 to 1.0)
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Check if music is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const backgroundMusic = new BackgroundMusicManager();

// Convenience functions
export const playBackgroundMusic = () => backgroundMusic.play();
export const stopBackgroundMusic = () => backgroundMusic.stop();
export const pauseBackgroundMusic = () => backgroundMusic.pause();
export const resumeBackgroundMusic = () => backgroundMusic.resume();
