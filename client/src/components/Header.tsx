import React from 'react';

import { GAME_META } from '../config/gameMeta';

const Header: React.FC = () => {
  return (
    <header className="header">
      <a href="/" className="logo">
        <img
          src={`${import.meta.env.BASE_URL}mascot.png`}
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
    </header>
  );
};

export default Header;
