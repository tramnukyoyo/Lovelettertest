import React, { useState } from 'react';
import { Settings } from 'lucide-react';

import { GAME_META } from '../config/gameMeta';
import { SettingsModal } from './SettingsModalNoir';

const Header: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="header">
      <a href="/" className="logo">
        <img
          src={`${import.meta.env.BASE_URL}mascot.webp`}
          alt={GAME_META.mascotAlt}
          className="logo-icon"
        />
        <div className="logo-text-container">
          <span className="logo-text">
            {GAME_META.namePrefix}
            <span className="accent">{GAME_META.nameAccent}</span>
          </span>
          <span className="gb-branding">
            <span className="gb-by">by </span>
            <span className="gb-game">Game</span>
            <span className="gb-buddies">Buddies</span>
            <span className="gb-io">.io</span>
          </span>
        </div>
      </a>

      <div className="header-right">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="game-header-settings-btn"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>

    {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};

export default Header;
