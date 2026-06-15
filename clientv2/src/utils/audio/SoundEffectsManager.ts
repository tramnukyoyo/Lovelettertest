/**
 * Sound Effects Manager
 *
 * Manages sound effect playback with pre-loading and volume control.
 */

export interface SoundEffectConfig {
  volume: number;
  enabled: boolean;
}

export const DEFAULT_SFX_CONFIG: SoundEffectConfig = {
  volume: 0.5,
  enabled: true
};

// Get base URL for asset paths
const getBaseUrl = () => {
  if (typeof window !== 'undefined' && (import.meta as any).env?.BASE_URL) {
    return (import.meta as any).env.BASE_URL;
  }
  return '/';
};

// Sound effects configuration - paths relative to public folder
export const SOUND_EFFECTS = {
  // Game event sounds
  win: 'music/win.mp3',
  lose: 'music/lose.mp3',
  countdown: 'music/countdown.mp3',

  // Typewriter sounds (randomly selected)
  type1: 'music/type1.wav',
  type2: 'music/type2.wav',
  type3: 'music/type3.wav',
  type4: 'music/type4.wav',
  type5: 'music/type5.wav',
  type6: 'music/type6.wav',
} as const;

export type SoundEffectName = keyof typeof SOUND_EFFECTS;

export class SoundEffectsManager {
  private config: SoundEffectConfig;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private preloaded = false;

  constructor(config: SoundEffectConfig = DEFAULT_SFX_CONFIG) {
    this.config = config;
  }

  /**
   * Preload all sound effects for instant playback
   */
  public async preload(): Promise<void> {
    if (this.preloaded) return;

    const baseUrl = getBaseUrl();
    const loadPromises = Object.values(SOUND_EFFECTS).map(async (path) => {
      const url = `${baseUrl}${path}`;
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        await new Promise<void>((resolve) => {
          audio.addEventListener('canplaythrough', () => {
            this.audioCache.set(path, audio);
            resolve();
          }, { once: true });
          audio.addEventListener('error', (e) => {
            // Log actual error details instead of [object Event]
            const mediaError = (e.target as HTMLAudioElement).error;
            console.warn(`[SoundEffects] Failed to preload: ${url}`,
              mediaError?.message || `code: ${mediaError?.code}`);
            resolve(); // Continue without this sound - fallback will try at play time
          }, { once: true });
          audio.load();
        });
      } catch (error) {
        console.warn(`[SoundEffects] Failed to preload: ${url}`, error);
      }
    });

    await Promise.all(loadPromises);
    this.preloaded = true;
  }

  /**
   * Play a sound effect by name
   */
  public play(name: SoundEffectName): void {
    if (!this.config.enabled) return;

    const path = SOUND_EFFECTS[name];
    if (!path) {
      console.warn(`[SoundEffects] Unknown sound: ${name}`);
      return;
    }

    let audio = this.audioCache.get(path);

    if (audio) {
      // Clone for overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.config.volume;
      clone.play().catch(() => {
        // Ignore autoplay errors
      });
    } else {
      // Fallback: create new audio element with full URL
      const baseUrl = getBaseUrl();
      audio = new Audio(`${baseUrl}${path}`);
      audio.volume = this.config.volume;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }

  /**
   * Play a random typewriter sound (type1-type6)
   */
  public playTypewriter(): void {
    if (!this.config.enabled) return;

    const typeNum = Math.floor(Math.random() * 6) + 1;
    const name = `type${typeNum}` as SoundEffectName;
    this.play(name);
  }

  /**
   * Play a sound effect from URL
   */
  public playUrl(url: string): void {
    if (!this.config.enabled) return;

    const audio = new Audio(url);
    audio.volume = this.config.volume;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }

  /**
   * Set the volume for sound effects (0-1)
   */
  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable/disable sound effects
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if sound effects are enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current volume
   */
  public getVolume(): number {
    return this.config.volume;
  }

  /**
   * Dispose of the manager
   */
  public dispose(): void {
    this.audioCache.forEach(audio => {
      audio.pause();
    });
    this.audioCache.clear();
    this.preloaded = false;
  }
}
