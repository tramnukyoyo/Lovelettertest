/**
 * Audio Utilities
 *
 * Provides background music and sound effects management.
 */

import { BackgroundMusicManager, type BackgroundMusicConfig } from './BackgroundMusicManager';
import { SoundEffectsManager, type SoundEffectConfig, SOUND_EFFECTS, type SoundEffectName } from './SoundEffectsManager';

// Get base URL for asset paths
const getBaseUrl = () => {
  if (typeof window !== 'undefined' && (import.meta as any).env?.BASE_URL) {
    return (import.meta as any).env.BASE_URL;
  }
  return '/';
};

// Default background music path (MP3 for iOS Safari compatibility)
export const BACKGROUND_MUSIC_PATH = 'music/background.mp3';

// Singleton instances for app-wide audio management
export const backgroundMusic = new BackgroundMusicManager();
export const soundEffects = new SoundEffectsManager();

/**
 * Start playing background music with the default track
 */
export const playBackgroundMusic = async () => {
  const baseUrl = getBaseUrl();
  await backgroundMusic.play(`${baseUrl}${BACKGROUND_MUSIC_PATH}`);
};

/**
 * Initialize audio system (preload sounds)
 */
export const initAudio = async () => {
  await soundEffects.preload();
};

// Re-export classes and types for custom instances if needed
export { BackgroundMusicManager, type BackgroundMusicConfig };
export { SoundEffectsManager, type SoundEffectConfig, SOUND_EFFECTS, type SoundEffectName };
