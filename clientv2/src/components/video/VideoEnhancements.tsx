/**
 * Video Enhancements Panel
 *
 * Controls for virtual background, face avatar, and audio processing.
 */

import React, { useState } from 'react';
import {
  Image,
  Smile,
  Volume2,
  Sliders,
  Check,
  X
} from 'lucide-react';
import { DEFAULT_BACKGROUNDS } from '../../services/videoEffectsConfig';
import { t } from '../../utils/translations';

interface VideoEnhancementsProps {
  // Virtual background
  isVirtualBackgroundEnabled?: boolean;
  onToggleVirtualBackground?: () => void;
  selectedBackground?: string | null;
  onSelectBackground?: (url: string | null) => void;
  // Face avatar
  isFaceAvatarEnabled?: boolean;
  onToggleFaceAvatar?: () => void;
  // Audio processing
  isNoiseSuppressionEnabled?: boolean;
  onToggleNoiseSuppression?: () => void;
  // UI
  className?: string;
}

const VideoEnhancements: React.FC<VideoEnhancementsProps> = ({
  isVirtualBackgroundEnabled = false,
  onToggleVirtualBackground: _onToggleVirtualBackground,
  selectedBackground,
  onSelectBackground,
  isFaceAvatarEnabled = false,
  onToggleFaceAvatar,
  isNoiseSuppressionEnabled = false,
  onToggleNoiseSuppression,
  className = ''
}) => {
  const [activeSection, setActiveSection] = useState<'background' | 'avatar' | 'audio' | null>(null);

  return (
    <div className={`video-enhancements ${className}`}>
      {/* Virtual Background */}
      <div className="enhancement-section">
        <button
          onClick={() => setActiveSection(activeSection === 'background' ? null : 'background')}
          className={`enhancement-toggle ${isVirtualBackgroundEnabled ? 'active' : ''}`}
        >
          <Image className="w-4 h-4" />
          <span>{t('videoEnhancements.virtualBackground')}</span>
          <span className="enhancement-status">
            {isVirtualBackgroundEnabled ? t('videoEnhancements.on') : t('videoEnhancements.off')}
          </span>
        </button>

        {activeSection === 'background' && (
          <div className="enhancement-content">
            <div className="background-options">
              {/* None option */}
              <button
                onClick={() => onSelectBackground?.(null)}
                className={`background-option ${!selectedBackground ? 'selected' : ''}`}
              >
                <X className="w-6 h-6" />
                <span>{t('videoEnhancements.none')}</span>
              </button>

              {/* Blur option */}
              <button
                onClick={() => onSelectBackground?.('blur')}
                className={`background-option ${selectedBackground === 'blur' ? 'selected' : ''}`}
              >
                <Sliders className="w-6 h-6" />
                <span>{t('videoEnhancements.blur')}</span>
              </button>

              {/* Background images */}
              {DEFAULT_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.name}
                  onClick={() => onSelectBackground?.(bg.url)}
                  className={`background-option image ${selectedBackground === bg.url ? 'selected' : ''}`}
                >
                  <img src={bg.url} alt={bg.name} />
                  {selectedBackground === bg.url && (
                    <span className="selected-indicator">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Face Avatar */}
      <div className="enhancement-section">
        <button
          onClick={onToggleFaceAvatar}
          className={`enhancement-toggle ${isFaceAvatarEnabled ? 'active' : ''}`}
        >
          <Smile className="w-4 h-4" />
          <span>{t('videoEnhancements.faceAvatar')}</span>
          <span className="enhancement-status">
            {isFaceAvatarEnabled ? t('videoEnhancements.on') : t('videoEnhancements.off')}
          </span>
        </button>
      </div>

      {/* Noise Suppression */}
      <div className="enhancement-section">
        <button
          onClick={onToggleNoiseSuppression}
          className={`enhancement-toggle ${isNoiseSuppressionEnabled ? 'active' : ''}`}
        >
          <Volume2 className="w-4 h-4" />
          <span>{t('videoEnhancements.noiseSuppression')}</span>
          <span className="enhancement-status">
            {isNoiseSuppressionEnabled ? t('videoEnhancements.on') : t('videoEnhancements.off')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default VideoEnhancements;
