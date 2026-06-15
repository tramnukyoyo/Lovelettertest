/**
 * Storage Keys
 * Centralized list of all sessionStorage and localStorage keys
 *
 * IMPORTANT: Use a unique prefix for your game to avoid conflicts
 * TODO: Change 'template' to your game's short name
 */

const GAME_PREFIX = 'primesuspect';

export const STORAGE_KEYS = {
  // Session storage (per-tab, cleared on tab close)
  SESSION: {
    SESSION_TOKEN: `${GAME_PREFIX}_session_token`,
    ROOM_CODE: `${GAME_PREFIX}_room_code`,
    PLAYER_NAME: `${GAME_PREFIX}_player_name`,
    GAMEBUDDIES_SESSION: 'gamebuddies:session', // Shared across games
  },

  // Local storage (persistent across sessions)
  LOCAL: {
    // Audio preferences
    BACKGROUND_MUSIC_ENABLED: `${GAME_PREFIX}_background_music`,
    BACKGROUND_MUSIC_VOLUME: `${GAME_PREFIX}_music_volume`,
    SOUND_EFFECTS_ENABLED: `${GAME_PREFIX}_sound_effects`,
    SOUND_EFFECTS_VOLUME: `${GAME_PREFIX}_sfx_volume`,

    // Video preferences
    VIDEO_ENABLED: `${GAME_PREFIX}_video_enabled`,
    CAMERA_DEVICE_ID: `${GAME_PREFIX}_camera_id`,
    MICROPHONE_DEVICE_ID: `${GAME_PREFIX}_mic_id`,
    VIRTUAL_BACKGROUND: `${GAME_PREFIX}_virtual_bg`,

    // Theme preferences
    THEME: `${GAME_PREFIX}_theme`,

    // Language preference
    LANGUAGE: `${GAME_PREFIX}_language`,

    // Tutorial
    TUTORIAL_COMPLETED: `${GAME_PREFIX}_tutorial_done`,

    // UI preferences
    SIDEBAR_COLLAPSED: `${GAME_PREFIX}_sidebar_collapsed`,
  },

  // Video UI preferences (filmstrip, popup mode, etc.)
  VIDEO_PREFERENCES: `${GAME_PREFIX}_video_preferences`,
} as const;
