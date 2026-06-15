/**
 * Background Music Manager
 *
 * Manages background music playback with volume control and loop functionality.
 */

export interface BackgroundMusicConfig {
  volume: number;
  loop: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export const DEFAULT_MUSIC_CONFIG: BackgroundMusicConfig = {
  volume: 0.3,
  loop: true,
  fadeInDuration: 1000,
  fadeOutDuration: 1000
};

export class BackgroundMusicManager {
  private audio: HTMLAudioElement | null = null;
  private config: BackgroundMusicConfig;
  private currentTrack: string | null = null;
  private isMuted = false;
  private isUnlocked = false;
  private pendingTrack: string | null = null;

  constructor(config: BackgroundMusicConfig = DEFAULT_MUSIC_CONFIG) {
    this.config = config;
  }

  /**
   * Create the audio element if it doesn't exist.
   * Reuses the same element for mobile compatibility.
   */
  private getOrCreateAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = this.config.loop;
      this.audio.volume = this.isMuted ? 0 : this.config.volume;
    }
    return this.audio;
  }

  /**
   * Unlock audio playback on mobile devices.
   * Must be called from a user gesture event (click, touch, keydown).
   * Creates/unlocks the audio element so subsequent plays work.
   */
  public async unlockAudio(): Promise<void> {
    if (this.isUnlocked) return;

    const audio = this.getOrCreateAudio();

    try {
      // Play a tiny silent moment to unlock audio on mobile
      // This works because we're in a user gesture context
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.muted = false;
      audio.currentTime = 0;
      this.isUnlocked = true;

      // If there was a pending track, play it now
      if (this.pendingTrack) {
        const track = this.pendingTrack;
        this.pendingTrack = null;
        await this.play(track);
      }
    } catch (error) {
      console.warn('[BackgroundMusic] Failed to unlock audio:', error);
    }
  }

  /**
   * Load and play a music track
   */
  public async play(trackUrl: string): Promise<void> {
    if (this.currentTrack === trackUrl && this.audio && !this.audio.paused) {
      return; // Already playing this track
    }

    // If not unlocked yet, store as pending and try anyway
    if (!this.isUnlocked) {
      this.pendingTrack = trackUrl;
    }

    // Stop current track with fade if playing
    if (this.audio && !this.audio.paused) {
      await this.stop();
    }

    // Reuse the same audio element (critical for mobile)
    const audio = this.getOrCreateAudio();
    audio.src = trackUrl;
    audio.loop = this.config.loop;
    audio.muted = false; // Reset muted state (unlockAudio sets muted=true and may not reset it on failure)
    audio.volume = this.isMuted ? 0 : this.config.volume;
    this.currentTrack = trackUrl;

    try {
      await audio.play();
      this.isUnlocked = true; // Mark as unlocked if play succeeds
      this.pendingTrack = null;
    } catch (error) {
      console.error('[BackgroundMusic] Failed to play:', error);
      throw error;
    }
  }

  /**
   * Stop the current music
   */
  public async stop(): Promise<void> {
    if (!this.audio) return;

    if (this.config.fadeOutDuration && this.config.fadeOutDuration > 0) {
      await this.fadeOut();
    }

    this.audio.pause();
    this.audio.currentTime = 0;
    // Don't null out audio element - keep it for mobile reuse
    this.currentTrack = null;
  }

  /**
   * Pause the current music
   */
  public pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * Resume the current music
   */
  public resume(): void {
    if (this.audio) {
      this.audio.play().catch(console.error);
    }
  }

  /**
   * Set the volume (0-1)
   */
  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.audio && !this.isMuted) {
      this.audio.volume = this.config.volume;
    }
  }

  /**
   * Mute/unmute the music
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.config.volume;
    }
  }

  /**
   * Check if currently playing
   */
  public isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  /**
   * Get current volume
   */
  public getVolume(): number {
    return this.config.volume;
  }

  private fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audio || !this.config.fadeOutDuration) {
        resolve();
        return;
      }

      const startVolume = this.audio.volume;
      const steps = 20;
      const stepDuration = this.config.fadeOutDuration / steps;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (this.audio) {
          this.audio.volume = Math.max(0, startVolume - volumeStep * currentStep);
        }

        if (currentStep >= steps) {
          clearInterval(interval);
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * Dispose of the manager
   */
  public dispose(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.currentTrack = null;
  }
}
