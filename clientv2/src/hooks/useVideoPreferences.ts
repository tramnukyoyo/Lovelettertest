/**
 * Video Preferences Hook
 *
 * Persists and restores video UI preferences to localStorage.
 * - Filmstrip expanded/collapsed state
 * - Popup layout mode
 */

import { useEffect } from 'react';
import { useVideoUI } from '../contexts/VideoUIContext';
import { STORAGE_KEYS } from '../config/storageKeys';

interface VideoPreferences {
  filmstripExpanded: boolean;
  popupLayoutMode: 'grid' | 'speaker' | 'spotlight';
}

const DEFAULT_PREFERENCES: VideoPreferences = {
  filmstripExpanded: false, // Collapsed by default
  popupLayoutMode: 'grid'
};

/**
 * Hook to persist and restore video UI preferences
 */
export const useVideoPreferences = () => {
  const { isFilmstripExpanded, setFilmstripExpanded } = useVideoUI();

  // Load preferences on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIDEO_PREFERENCES);
      if (stored) {
        const prefs: VideoPreferences = JSON.parse(stored);
        if (typeof prefs.filmstripExpanded === 'boolean') {
          setFilmstripExpanded(prefs.filmstripExpanded);
        }
      }
    } catch (err) {
      console.warn('[VideoPreferences] Failed to load preferences:', err);
    }
  }, [setFilmstripExpanded]);

  // Save filmstrip preference when it changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIDEO_PREFERENCES);
      const prefs: VideoPreferences = stored
        ? JSON.parse(stored)
        : { ...DEFAULT_PREFERENCES };

      prefs.filmstripExpanded = isFilmstripExpanded;
      localStorage.setItem(STORAGE_KEYS.VIDEO_PREFERENCES, JSON.stringify(prefs));
    } catch (err) {
      console.warn('[VideoPreferences] Failed to save preferences:', err);
    }
  }, [isFilmstripExpanded]);
};

/**
 * Get popup layout preference
 */
export const getPopupLayoutPreference = (): 'grid' | 'speaker' | 'spotlight' => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VIDEO_PREFERENCES);
    if (stored) {
      const prefs: VideoPreferences = JSON.parse(stored);
      if (prefs.popupLayoutMode) {
        return prefs.popupLayoutMode;
      }
    }
  } catch (err) {
    console.warn('[VideoPreferences] Failed to load layout preference:', err);
  }
  return DEFAULT_PREFERENCES.popupLayoutMode;
};

/**
 * Save popup layout preference
 */
export const savePopupLayoutPreference = (mode: 'grid' | 'speaker' | 'spotlight') => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VIDEO_PREFERENCES);
    const prefs: VideoPreferences = stored
      ? JSON.parse(stored)
      : { ...DEFAULT_PREFERENCES };

    prefs.popupLayoutMode = mode;
    localStorage.setItem(STORAGE_KEYS.VIDEO_PREFERENCES, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[VideoPreferences] Failed to save layout preference:', err);
  }
};

export default useVideoPreferences;
