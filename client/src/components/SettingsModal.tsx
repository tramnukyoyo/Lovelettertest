import React, { useState, useEffect } from 'react';
import { soundEffects } from '../utils/soundEffects';
import { backgroundMusic } from '../utils/backgroundMusic';

interface SettingsModalProps {
  onClose: () => void;
}

/**
 * Settings Modal - Audio controls (volume, mute)
 * Displays as centered modal overlay
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [volume, setVolume] = useState(50);
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    // Load volume
    const savedVolume = localStorage.getItem('thinkalike-volume');
    if (savedVolume) {
      const vol = parseInt(savedVolume, 10);
      setVolume(vol);
      soundEffects.setVolume(vol / 100);
      backgroundMusic.setVolume(vol / 100);
    }

    // Load background music preference
    const savedBgMusic = localStorage.getItem('thinkalike-background-music-enabled');
    const bgMusicEnabled = savedBgMusic ? JSON.parse(savedBgMusic) : false;
    setBackgroundMusicEnabled(bgMusicEnabled);
    backgroundMusic.setEnabled(bgMusicEnabled);

    // Load sound effects preference
    const savedSfx = localStorage.getItem('thinkalike-sound-effects-enabled');
    const sfxEnabled = savedSfx ? JSON.parse(savedSfx) : true;
    setSoundEffectsEnabled(sfxEnabled);
    soundEffects.setEnabled(sfxEnabled);

    // Migrate old 'muted' setting if present
    const oldMuted = localStorage.getItem('thinkalike-muted');
    if (oldMuted && !savedSfx) {
      const wasMuted = JSON.parse(oldMuted);
      localStorage.setItem('thinkalike-sound-effects-enabled', JSON.stringify(!wasMuted));
      localStorage.removeItem('thinkalike-muted');
    }
  }, []);

  // Handle volume change (sync both sound effect and background music)
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    const normalizedVolume = newVolume / 100;
    soundEffects.setVolume(normalizedVolume);
    backgroundMusic.setVolume(normalizedVolume);
    localStorage.setItem('thinkalike-volume', String(newVolume));
  };

  // Handle background music toggle
  const handleBackgroundMusicToggle = () => {
    const newEnabled = !backgroundMusicEnabled;
    setBackgroundMusicEnabled(newEnabled);
    backgroundMusic.setEnabled(newEnabled);
    localStorage.setItem('thinkalike-background-music-enabled', JSON.stringify(newEnabled));
  };

  // Handle sound effects toggle
  const handleSoundEffectsToggle = () => {
    const newEnabled = !soundEffectsEnabled;
    setSoundEffectsEnabled(newEnabled);
    soundEffects.setEnabled(newEnabled);
    localStorage.setItem('thinkalike-sound-effects-enabled', JSON.stringify(newEnabled));
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="settings-modal-backdrop" onClick={handleBackdropClick} aria-hidden="true" />

      {/* Modal Panel */}
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className="settings-modal-header">
          <h2 id="settings-modal-title">Settings</h2>
          <button
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-modal-content">
          {/* Volume Control */}
          <div className="settings-section">
            <label className="settings-label">
              <span className="volume-icon">🔊</span>
              <span>Volume</span>
            </label>
            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                aria-label="Volume"
              />
              <span className="volume-value">{volume}%</span>
            </div>
          </div>

          {/* Background Music Toggle */}
          <div className="settings-section">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={backgroundMusicEnabled}
                onChange={handleBackgroundMusicToggle}
                className="mute-checkbox"
                aria-label="Enable background music"
                key={`bgmusic-${backgroundMusicEnabled}`}
              />
              <span className="toggle-label">Enable Background Music</span>
            </label>
          </div>

          {/* Sound Effects Toggle */}
          <div className="settings-section">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={soundEffectsEnabled}
                onChange={handleSoundEffectsToggle}
                className="mute-checkbox"
                aria-label="Enable sound effects"
                key={`sfx-${soundEffectsEnabled}`}
              />
              <span className="toggle-label">Enable Sound Effects</span>
            </label>
          </div>
        </div>

        <div className="settings-modal-footer">
          <p className="settings-hint">Sound settings saved automatically</p>
        </div>
      </div>
    </>
  );
};

export default SettingsModal;
