/**
 * Settings Modal
 *
 * Modal for game settings including language and audio settings.
 * Video settings are accessed via DeviceSettingsModal from video controls.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Palette, Globe } from 'lucide-react';
import { getCurrentLanguage, setCurrentLanguage, t } from '../../utils/translations';
import { backgroundMusic, soundEffects } from '../../utils/audio';

// localStorage keys for audio settings
const STORAGE_KEYS = {
  MUSIC_VOLUME: 'gamebuddies-music-volume',
  MUSIC_ENABLED: 'gamebuddies-music-enabled',
  SFX_VOLUME: 'gamebuddies-sfx-volume',
  SFX_ENABLED: 'gamebuddies-sfx-enabled',
};

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'general' | 'audio';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [language, setLanguage] = useState(getCurrentLanguage());

  // Helper to safely get localStorage (handles private mode/quota errors)
  const safeGetItem = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('[SettingsModal] localStorage unavailable:', e);
      return null;
    }
  };

  // Helper to safely set localStorage
  const safeSetItem = (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[SettingsModal] Failed to save to localStorage:', e);
    }
  };

  // Load audio settings from localStorage with defaults
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = safeGetItem(STORAGE_KEYS.MUSIC_VOLUME);
    return saved ? parseInt(saved, 10) : 30;
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = safeGetItem(STORAGE_KEYS.SFX_VOLUME);
    return saved ? parseInt(saved, 10) : 50;
  });
  const [musicEnabled, setMusicEnabled] = useState(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.MUSIC_ENABLED);
      return saved ? JSON.parse(saved) : true;
    } catch {
      console.warn('[SettingsModal] Invalid musicEnabled in localStorage, using default');
      return true;
    }
  });
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.SFX_ENABLED);
      return saved ? JSON.parse(saved) : true;
    } catch {
      console.warn('[SettingsModal] Invalid sfxEnabled in localStorage, using default');
      return true;
    }
  });

  // Apply audio settings to managers on mount
  useEffect(() => {
    backgroundMusic.setVolume(musicVolume / 100);
    backgroundMusic.setMuted(!musicEnabled);
    soundEffects.setVolume(sfxVolume / 100);
    soundEffects.setEnabled(sfxEnabled);
  }, []);

  // Handle music volume changes
  const handleMusicVolumeChange = (value: number) => {
    setMusicVolume(value);
    backgroundMusic.setVolume(value / 100);
    safeSetItem(STORAGE_KEYS.MUSIC_VOLUME, String(value));
  };

  // Handle music toggle
  const handleMusicToggle = () => {
    const newEnabled = !musicEnabled;
    setMusicEnabled(newEnabled);
    backgroundMusic.setMuted(!newEnabled);
    safeSetItem(STORAGE_KEYS.MUSIC_ENABLED, JSON.stringify(newEnabled));
    window.dispatchEvent(new Event('gamebuddies:audio-changed'));
  };

  // Handle SFX volume changes
  const handleSfxVolumeChange = (value: number) => {
    setSfxVolume(value);
    soundEffects.setVolume(value / 100);
    safeSetItem(STORAGE_KEYS.SFX_VOLUME, String(value));
  };

  // Handle SFX toggle
  const handleSfxToggle = () => {
    const newEnabled = !sfxEnabled;
    setSfxEnabled(newEnabled);
    soundEffects.setEnabled(newEnabled);
    safeSetItem(STORAGE_KEYS.SFX_ENABLED, JSON.stringify(newEnabled));
    window.dispatchEvent(new Event('gamebuddies:audio-changed'));
  };

  const handleLanguageChange = (lang: 'en' | 'de') => {
    setLanguage(lang);
    setCurrentLanguage(lang);
  };

  const tabs = [
    { id: 'general' as const, label: t('settings.general'), icon: Palette },
    { id: 'audio' as const, label: t('settings.audio'), icon: Volume2 },
  ];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="settings-modal-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="settings-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="settings-modal-header">
            <h2 className="settings-modal-title">{t('settings.title')}</h2>
            <button
              onClick={onClose}
              className="settings-modal-close"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="settings-modal-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-modal-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="settings-modal-content">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="settings-section">
                {/* Language */}
                <div className="settings-row">
                  <div className="settings-row-label">
                    <Globe className="w-4 h-4" />
                    <span>{t('settings.language')}</span>
                  </div>
                  <div className="settings-language-btns">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`settings-lang-btn ${language === 'en' ? 'active' : ''}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => handleLanguageChange('de')}
                      className={`settings-lang-btn ${language === 'de' ? 'active' : ''}`}
                    >
                      Deutsch
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Tab */}
            {activeTab === 'audio' && (
              <div className="settings-section">
                {/* Music Volume */}
                <div className="settings-row">
                  <div className="settings-row-header">
                    <div className="settings-row-label">
                      <Volume2 className="w-4 h-4" />
                      <span>{t('settings.music')}</span>
                    </div>
                    <button
                      onClick={handleMusicToggle}
                      className={`settings-toggle ${musicEnabled ? 'on' : 'off'}`}
                    >
                      {musicEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={(e) => handleMusicVolumeChange(parseInt(e.target.value))}
                    className="settings-slider"
                    disabled={!musicEnabled}
                  />
                  <span className="settings-volume-value">{musicVolume}%</span>
                </div>

                {/* SFX Volume */}
                <div className="settings-row">
                  <div className="settings-row-header">
                    <div className="settings-row-label">
                      <Volume2 className="w-4 h-4" />
                      <span>{t('settings.soundEffects')}</span>
                    </div>
                    <button
                      onClick={handleSfxToggle}
                      className={`settings-toggle ${sfxEnabled ? 'on' : 'off'}`}
                    >
                      {sfxEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume}
                    onChange={(e) => handleSfxVolumeChange(parseInt(e.target.value))}
                    className="settings-slider"
                    disabled={!sfxEnabled}
                  />
                  <span className="settings-volume-value">{sfxVolume}%</span>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default SettingsModal;
