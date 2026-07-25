import React, { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Crown, User, Mail } from 'lucide-react';
import { t } from '../../utils/translations';

interface GameAccountControlProps {
  name: string;
  isLoggedIn: boolean;
  isPremium: boolean;
  /** false inside a Discord Activity where platform login/logout isn't viable. */
  canAuth: boolean;
  onLogin: () => void;
  onLogout: () => void;
  /** Opens the in-game inbox. The permanent way in: the header's mail icon only
   *  exists while a conversation is live, so without this a player could never
   *  start one from inside a game. Passed as a callback so this component stays
   *  presentational and does not subscribe to the inbox store. */
  onOpenMessages?: () => void;
}

/**
 * Account control for the game header — mirrors the gamebuddies.io header.
 *
 * Games have no auth session of their own, so this only DISPLAYS identity
 * (name + premium, resolved by GameHeader from room state / the platform
 * profile store) and triggers login/logout, which round-trip to the
 * same-origin platform. Presentational: all state comes in as props.
 */
const GameAccountControl: React.FC<GameAccountControlProps> = ({
  name,
  isLoggedIn,
  isPremium,
  canAuth,
  onLogin,
  onLogout,
  onOpenMessages,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  // Guest / not logged in → a single login button (hidden in Discord).
  if (!isLoggedIn) {
    if (!canAuth) return null;
    return (
      <button
        type="button"
        className="game-header-lobby-btn"
        onClick={onLogin}
        title={t('header.loginTitle')}
      >
        <LogIn className="w-4 h-4" />
        {t('header.login')}
      </button>
    );
  }

  // Logged in → identity chip (+ premium crown), with a dropdown to log out.
  return (
    <div className="game-header-account" ref={rootRef}>
      <button
        type="button"
        className={`game-header-account-chip ${isPremium ? 'is-premium' : ''}`}
        onClick={() => canAuth && setMenuOpen((o) => !o)}
        title={name}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {isPremium ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
        <span className="game-header-account-name">{name}</span>
      </button>
      {menuOpen && canAuth && (
        <div className="game-header-account-menu" role="menu">
          {onOpenMessages && (
            <button
              type="button"
              className="game-header-account-menu-item"
              onClick={() => { setMenuOpen(false); onOpenMessages(); }}
            >
              <Mail className="w-4 h-4" />
              {t('adminMessage.buttonLabel')}
            </button>
          )}
          <button
            type="button"
            className="game-header-account-menu-item"
            onClick={() => { setMenuOpen(false); onLogout(); }}
          >
            <LogOut className="w-4 h-4" />
            {t('header.logout')}
          </button>
        </div>
      )}
    </div>
  );
};

export default GameAccountControl;
