import React, { createContext, useContext, useState, useCallback } from 'react';
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

  // Popup window state
  isPopupOpen: boolean;
  requestPopup: () => void;
  closePopup: () => void;
  setPopupOpen: (open: boolean) => void;

  // Popup request callback (set by WebcamDisplay)
  onPopupRequested: (() => void) | null;
  setOnPopupRequested: (callback: (() => void) | null) => void;
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
  // Filmstrip state - collapsed by default (per user preference)
  const [isFilmstripExpanded, setFilmstripExpanded] = useState(false);

  // Settings modal state
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  // Popup window state
  const [isPopupOpen, setPopupOpen] = useState(false);

  // Callback for popup request (set by WebcamDisplay)
  const [onPopupRequested, setOnPopupRequested] = useState<(() => void) | null>(null);

  const toggleFilmstrip = useCallback(() => {
    setFilmstripExpanded(prev => !prev);
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const requestPopup = useCallback(() => {
    if (onPopupRequested) {
      onPopupRequested();
    }
  }, [onPopupRequested]);

  const closePopup = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const contextValue: VideoUIContextState = {
    isFilmstripExpanded,
    setFilmstripExpanded,
    toggleFilmstrip,
    isSettingsOpen,
    openSettings,
    closeSettings,
    isPopupOpen,
    requestPopup,
    closePopup,
    setPopupOpen,
    onPopupRequested,
    setOnPopupRequested
  };

  return (
    <VideoUIContext.Provider value={contextValue}>
      {children}
    </VideoUIContext.Provider>
  );
};

export default VideoUIContext;
