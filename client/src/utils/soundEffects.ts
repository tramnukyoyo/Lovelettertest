/**
 * Sound Effects Utility for Prime Suspect
 *
 * Manages audio playback for game events.
 * Sound files should be placed in: client/public/music/ or client/public/sounds/
 */

type SoundType = 'match' | 'lose-life' | 'timer-tick' | 'victory' | 'countdown' | 'win' | 'lose' | 'draw' | 'drop' | 'eliminated' | 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6';

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
      'lose': '/music/lose.mp3',
      'draw': '/music/draw.wav',
      'drop': '/music/drop.wav',
      'eliminated': '/music/gunshot.mp3',
      'type1': '/music/type1.wav',
      'type2': '/music/type2.wav',
      'type3': '/music/type3.wav',
      'type4': '/music/type4.wav',
      'type5': '/music/type5.wav',
      'type6': '/music/type6.wav'
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
export const playDrawSound = () => soundEffects.play('draw');
export const playDropSound = () => soundEffects.play('drop');
export const playEliminatedSound = () => soundEffects.play('eliminated');

// Play a random typewriter key sound
export const playTypewriterSound = () => {
  const num = Math.floor(Math.random() * 6) + 1;
  soundEffects.play(`type${num}` as SoundType);
};
