import React from 'react';
import { Eye } from 'lucide-react';

const SpectatorBanner: React.FC = () => (
  <div className="spectator-banner">
    <Eye size={16} />
    <span>You're spectating — you'll be able to play next round</span>
  </div>
);

export default SpectatorBanner;
