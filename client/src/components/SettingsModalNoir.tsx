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
  const [musicVolume, setMusicVolume] = useState(1);
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);

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

  useEffect(() => {
    const savedMusicVolume = localStorage.getItem('heartsgambit-music-volume');
    const musicVol = savedMusicVolume ? parseInt(savedMusicVolume, 10) : 1;
    const safeMusicVolume = Number.isFinite(musicVol) ? Math.max(0, Math.min(100, musicVol)) : 1;
    setMusicVolume(safeMusicVolume);

    const savedBgMusic = localStorage.getItem('heartsgambit-background-music-enabled');
    const bgMusicEnabled = savedBgMusic ? JSON.parse(savedBgMusic) : true;
    setBackgroundMusicEnabled(!!bgMusicEnabled);

    const savedSfx = localStorage.getItem('heartsgambit-sound-effects-enabled');
    const sfxEnabled = savedSfx ? JSON.parse(savedSfx) : true;
    setSoundEffectsEnabled(!!sfxEnabled);

    soundEffects.setEnabled(!!sfxEnabled);
    backgroundMusic.setEnabled(!!bgMusicEnabled);
    backgroundMusic.setVolume(safeMusicVolume / 100);

    const oldMuted = localStorage.getItem('heartsgambit-muted');
    if (oldMuted && !savedSfx) {
      const wasMuted = JSON.parse(oldMuted);
      localStorage.setItem('heartsgambit-sound-effects-enabled', JSON.stringify(!wasMuted));
      localStorage.removeItem('heartsgambit-muted');
    }
  }, []);

  useEffect(() => {
    backgroundMusic.setVolume(normalizedMusicVolume);
    localStorage.setItem('heartsgambit-music-volume', String(musicVolume));
  }, [normalizedMusicVolume, musicVolume]);

  const toggleBackgroundMusic = () => {
    const next = !backgroundMusicEnabled;
    setBackgroundMusicEnabled(next);
    backgroundMusic.setEnabled(next);
    localStorage.setItem('heartsgambit-background-music-enabled', JSON.stringify(next));
  };

  const toggleSoundEffects = () => {
    const next = !soundEffectsEnabled;
    setSoundEffectsEnabled(next);
    soundEffects.setEnabled(next);
    localStorage.setItem('heartsgambit-sound-effects-enabled', JSON.stringify(next));
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
