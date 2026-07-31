import React from 'react';
import { Eye, X } from 'lucide-react';
import { t } from '../../utils/translations';
import { usePlayerProfile } from '../../services/playerProfiles';
import { cosmeticClass } from '../../utils/cosmetics';

interface SpectatorBannerProps {
  viewingAs?: { id?: string; name: string } | null;
  onResetView?: () => void;
}

const SpectatorBanner: React.FC<SpectatorBannerProps> = ({ viewingAs, onResetView }) => {
  // Platform cosmetics: name flair on the viewed player (gb:player:profile).
  const profile = usePlayerProfile(viewingAs?.id);
  const flairClass = cosmeticClass(profile?.cosmetics.flairId);
  // viewingAs label: split the raw localized "Viewing as {name}" pattern around
  // the {name} token so we can wrap the actual name in <strong>.
  const renderViewingAs = (name: string) => {
    const raw = t('spectator.viewingAs');
    const parts = raw.split('{name}');
    return (
      <span>{parts[0]}<strong className={flairClass || undefined}>{name}</strong>{parts[1] ?? ''}</span>
    );
  };
  return (
    <div className="spectator-banner">
      <Eye size={16} />
      {viewingAs ? (
        <>
          {renderViewingAs(viewingAs.name)}
          <button className="spectator-reset-btn" onClick={onResetView} aria-label={t('spectator.resetView')}>
            <X size={14} />
          </button>
        </>
      ) : (
        <span>{t('spectator.spectating')}</span>
      )}
    </div>
  );
};

export default SpectatorBanner;
