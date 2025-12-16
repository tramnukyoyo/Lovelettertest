/**
 * Sound Effects Utility for ThinkAlike
 *
 * Manages audio playback for game events.
 * Sound files should be placed in: client/src/assets/sounds/
 */

type SoundType = 'match' | 'lose-life' | 'timer-tick' | 'victory' | 'countdown' | 'win' | 'lose';

class SoundEffectsManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.loadSounds();
  }

  /**
   * Load all sound files
   */
  private loadSounds() {
    const soundFiles: Record<SoundType, string> = {
      'match': '/sounds/match.mp3',
      'lose-life': '/music/lose.mp3',
      'timer-tick': '/sounds/timer-tick.mp3',
      'victory': '/sounds/victory.mp3',
      'countdown': '/music/countdown.mp3',
      'win': '/music/win.mp3',
      'lose': '/music/lose.mp3'
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      try {
        const audio = new Audio(import.meta.env.BASE_URL + path);
        audio.volume = this.volume;
        this.sounds.set(key as SoundType, audio);
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
      }
    });
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType) {
    if (!this.enabled) return;

    const sound = this.sounds.get(type);
    if (sound) {
      // Reset to start if already playing
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.warn(`Failed to play sound: ${type}`, error);
      });
    }
  }

  /**
   * Set volume for all sounds (0.0 to 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  /**
   * Enable or disable all sounds
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Toggle sound on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

// Export singleton instance
export const soundEffects = new SoundEffectsManager();

// Convenience functions
export const playMatchSound = () => soundEffects.play('match');
export const playLoseLifeSound = () => soundEffects.play('lose-life');
export const playTimerTickSound = () => soundEffects.play('timer-tick');
export const playVictorySound = () => soundEffects.play('victory');
export const playCountdownSound = () => soundEffects.play('countdown');
export const playWinSound = () => soundEffects.play('win');
export const playLoseSound = () => soundEffects.play('lose');
