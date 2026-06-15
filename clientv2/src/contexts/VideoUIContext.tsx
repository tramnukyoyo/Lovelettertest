/**
 * Video UI Context
 *
 * Manages video-related UI state like filmstrip expansion,
 * settings modal, and streamer broadcast window state.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

interface VideoUIContextState {
  // Filmstrip state
  isFilmstripExpanded: boolean;
  setFilmstripExpanded: (expanded: boolean) => void;
  toggleFilmstrip: () => void;

  // Settings modal state
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // Streamer broadcast window state
  isStreamerBroadcastOpen: boolean;
  setStreamerBroadcastOpen: (open: boolean) => void;
  requestStreamerBroadcast: () => void;
  onBroadcastRequested: (() => void) | null;
  setOnBroadcastRequested: (callback: (() => void) | null) => void;
}

const VideoUIContext = createContext<VideoUIContextState | undefined>(undefined);

export const useVideoUI = (): VideoUIContextState => {
  const context = useContext(VideoUIContext);
  if (!context) {
    throw new Error('useVideoUI must be used within a VideoUIProvider');
  }
  return context;
};

interface VideoUIProviderProps {
  children: ReactNode;
}

export const VideoUIProvider: React.FC<VideoUIProviderProps> = ({ children }) => {
  const [isFilmstripExpanded, setFilmstripExpanded] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isStreamerBroadcastOpen, setStreamerBroadcastOpen] = useState(false);
  const [onBroadcastRequested, setOnBroadcastRequested] = useState<(() => void) | null>(null);

  const toggleFilmstrip = useCallback(() => {
    setFilmstripExpanded(prev => !prev);
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const requestStreamerBroadcast = useCallback(() => {
    if (onBroadcastRequested) {
      onBroadcastRequested();
    }
  }, [onBroadcastRequested]);

  const contextValue = useMemo<VideoUIContextState>(() => ({
    isFilmstripExpanded,
    setFilmstripExpanded,
    toggleFilmstrip,
    isSettingsOpen,
    openSettings,
    closeSettings,
    isStreamerBroadcastOpen,
    setStreamerBroadcastOpen,
    requestStreamerBroadcast,
    onBroadcastRequested,
    setOnBroadcastRequested
  }), [
    isFilmstripExpanded,
    toggleFilmstrip,
    isSettingsOpen,
    openSettings,
    closeSettings,
    isStreamerBroadcastOpen,
    requestStreamerBroadcast,
    onBroadcastRequested
  ]);

  return (
    <VideoUIContext.Provider value={contextValue}>
      {children}
    </VideoUIContext.Provider>
  );
};

export default VideoUIContext;
