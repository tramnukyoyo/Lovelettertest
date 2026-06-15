/**
 * Video Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcuts for video controls:
 * - V: Toggle video filmstrip visibility
 * - M: Toggle microphone mute/unmute
 * - C: Toggle camera on/off
 * - B: Open streamer broadcast window
 */

import { useEffect, useCallback } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useVideoUI } from '../contexts/VideoUIContext';

export const useVideoKeyboardShortcuts = () => {
  const {
    isVideoChatActive,
    toggleAudio,
    toggleVideo
  } = useWebRTC();

  const {
    toggleFilmstrip,
    requestStreamerBroadcast
  } = useVideoUI();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Only enable shortcuts when video chat is active
    if (!isVideoChatActive) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'v':
        // V: Toggle filmstrip visibility
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          toggleFilmstrip();
        }
        break;

      case 'm':
        // M: Toggle microphone
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          toggleAudio();
        }
        break;

      case 'c':
        // C: Toggle camera (only if not Ctrl+C for copy)
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          toggleVideo();
        }
        break;

      case 'b':
        // B: Open streamer broadcast
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          requestStreamerBroadcast();
        }
        break;
    }
  }, [isVideoChatActive, toggleFilmstrip, toggleAudio, toggleVideo, requestStreamerBroadcast]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

export default useVideoKeyboardShortcuts;
