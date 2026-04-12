import React from 'react';
import { Eye, X } from 'lucide-react';

interface SpectatorBannerProps {
  viewingAs?: { name: string } | null;
  onResetView?: () => void;
}

const SpectatorBanner: React.FC<SpectatorBannerProps> = ({ viewingAs, onResetView }) => (
  <div className="spectator-banner">
    <Eye size={16} />
    {viewingAs ? (
      <>
        <span>Viewing as <strong>{viewingAs.name}</strong></span>
        <button className="spectator-reset-btn" onClick={onResetView} aria-label="Reset view">
          <X size={14} />
        </button>
      </>
    ) : (
      <span>You're spectating — click a player to see their view</span>
    )}
  </div>
);

export default SpectatorBanner;
