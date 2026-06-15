/**
 * Mute Button
 *
 * Quick-access toggle to mute/unmute all game audio (music + SFX).
 * Syncs with SettingsModal via custom event.
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { backgroundMusic, soundEffects } from '../../utils/audio';

const STORAGE_KEYS = {
  MUSIC_ENABLED: 'gamebuddies-music-enabled',
  SFX_ENABLED: 'gamebuddies-sfx-enabled',
};

const MuteButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const music = localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED);
      const sfx = localStorage.getItem(STORAGE_KEYS.SFX_ENABLED);
      return music === 'false' && sfx === 'false';
    } catch { return false; }
  });

  useEffect(() => {
    const syncState = () => {
      try {
        const music = localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED);
        const sfx = localStorage.getItem(STORAGE_KEYS.SFX_ENABLED);
        setIsMuted(music === 'false' && sfx === 'false');
      } catch {}
    };
    window.addEventListener('gamebuddies:audio-changed', syncState);
    return () => window.removeEventListener('gamebuddies:audio-changed', syncState);
  }, []);

  const toggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    backgroundMusic.setMuted(newMuted);
    soundEffects.setEnabled(!newMuted);

    try {
      localStorage.setItem(STORAGE_KEYS.MUSIC_ENABLED, JSON.stringify(!newMuted));
      localStorage.setItem(STORAGE_KEYS.SFX_ENABLED, JSON.stringify(!newMuted));
    } catch {}

    window.dispatchEvent(new Event('gamebuddies:audio-changed'));
  };

  return (
    <button
      onClick={toggle}
      className={`game-header-mute-btn ${isMuted ? 'muted' : ''} ${className}`}
      title={isMuted ? 'Unmute' : 'Mute'}
      aria-label={isMuted ? 'Unmute game audio' : 'Mute game audio'}
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
};

export default MuteButton;
