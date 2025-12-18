import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, Music2, Sparkles } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { backgroundMusic } from '../utils/backgroundMusic';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Lazy initialization from localStorage
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('primesuspect-music-volume');
    if (saved) {
      const val = parseInt(saved, 10);
      return Number.isFinite(val) ? Math.max(0, Math.min(100, val)) : 50;
    }
    return 50;
  });

  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem('primesuspect-volume');
    if (saved) {
      const val = parseInt(saved, 10);
      return Number.isFinite(val) ? Math.max(0, Math.min(100, val)) : 50;
    }
    return 50;
  });

  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(() => {
    const saved = localStorage.getItem('primesuspect-background-music-enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    const saved = localStorage.getItem('primesuspect-sound-effects-enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const normalizedMusicVolume = useMemo(() => Math.max(0, Math.min(1, musicVolume / 100)), [musicVolume]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Apply initial settings on mount
  useEffect(() => {
    soundEffects.setEnabled(soundEffectsEnabled);
    soundEffects.setVolume(sfxVolume / 100);
    backgroundMusic.setEnabled(backgroundMusicEnabled);
    backgroundMusic.setVolume(musicVolume / 100);
  }, []);

  // Save and apply music volume changes
  useEffect(() => {
    backgroundMusic.setVolume(normalizedMusicVolume);
    localStorage.setItem('primesuspect-music-volume', String(musicVolume));
  }, [normalizedMusicVolume, musicVolume]);

  // Save and apply sfx volume changes
  useEffect(() => {
    soundEffects.setVolume(sfxVolume / 100);
    localStorage.setItem('primesuspect-volume', String(sfxVolume));
  }, [sfxVolume]);

  const toggleBackgroundMusic = () => {
    const next = !backgroundMusicEnabled;
    setBackgroundMusicEnabled(next);
    backgroundMusic.setEnabled(next);
    localStorage.setItem('primesuspect-background-music-enabled', JSON.stringify(next));
  };

  const toggleSoundEffects = () => {
    const next = !soundEffectsEnabled;
    setSoundEffectsEnabled(next);
    soundEffects.setEnabled(next);
    localStorage.setItem('primesuspect-sound-effects-enabled', JSON.stringify(next));
  };

  return createPortal(
    <div
      className="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="settings-modal-panel hg-panel hg-candlelight"
        onPointerDown={(e) => e.stopPropagation()}
      >
          <div className="settings-modal-header">
            <div className="settings-modal-title">
              <div className="settings-modal-eyebrow">Case Settings</div>
              <h2 id="settings-modal-title">Ambience</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="settings-modal-close"
              onClick={onClose}
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="settings-modal-content">
            <section className="settings-section">
              <div className="settings-row">
                <div className="settings-row-label">
                  <Music2 className="w-4 h-4" />
                  <span>Background Music</span>
                </div>
                <div className="settings-row-actions">
                  <span className="settings-row-value">{backgroundMusicEnabled ? 'ON' : 'OFF'}</span>
                  <button
                    type="button"
                    className={`settings-switch ${backgroundMusicEnabled ? 'on' : 'off'}`}
                    role="switch"
                    aria-checked={backgroundMusicEnabled}
                    onClick={toggleBackgroundMusic}
                  >
                    <span className="settings-switch-thumb" />
                  </button>
                </div>
              </div>
              <div className="settings-row" style={{ marginBottom: 0 }}>
                <div className="settings-row-label">
                  <Volume2 className="w-4 h-4" />
                  <span>Music Volume</span>
                </div>
                <div className="settings-row-value">{musicVolume}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseInt(e.target.value, 10))}
                className="settings-slider"
                aria-label="Music volume"
              />
              <div className="settings-subtext">
                If music does not start, click once anywhere (browser autoplay rule).
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-row">
                <div className="settings-row-label">
                  <Sparkles className="w-4 h-4" />
                  <span>Sound Effects</span>
                </div>
                <div className="settings-row-actions">
                  <span className="settings-row-value">{soundEffectsEnabled ? 'ON' : 'OFF'}</span>
                  <button
                    type="button"
                    className={`settings-switch ${soundEffectsEnabled ? 'on' : 'off'}`}
                    role="switch"
                    aria-checked={soundEffectsEnabled}
                    onClick={toggleSoundEffects}
                  >
                    <span className="settings-switch-thumb" />
                  </button>
                </div>
              </div>
              <div className="settings-row" style={{ marginBottom: 0 }}>
                <div className="settings-row-label">
                  <Volume2 className="w-4 h-4" />
                  <span>Effects Volume</span>
                </div>
                <div className="settings-row-value">{sfxVolume}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sfxVolume}
                onChange={(e) => setSfxVolume(parseInt(e.target.value, 10))}
                className="settings-slider"
                aria-label="Sound effects volume"
              />
            </section>
          </div>

          <div className="settings-modal-footer">
            <div className="settings-hint">Saved automatically</div>
          </div>
        </div>
      </div>,
    document.body
  );
};

export default SettingsModal;
