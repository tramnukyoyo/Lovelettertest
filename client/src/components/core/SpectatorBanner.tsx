import React from 'react';
import { Eye, X } from 'lucide-react';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

interface SpectatorBannerProps {
  viewingAs?: { name: string } | null;
  onResetView?: () => void;
}

const SpectatorBanner: React.FC<SpectatorBannerProps> = ({ viewingAs, onResetView }) => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as keyof typeof import('../../utils/translations').translations.en, language);
  return (
    <div className="spectator-banner">
      <Eye size={16} />
      {viewingAs ? (
        <>
          <span>{t('spectator.viewingAs')} <strong>{viewingAs.name}</strong></span>
          <button className="spectator-reset-btn" onClick={onResetView} aria-label={t('spectator.resetView')}>
            <X size={14} />
          </button>
        </>
      ) : (
        <span>{t('spectator.youAreSpectating')}</span>
      )}
    </div>
  );
};

export default SpectatorBanner;
