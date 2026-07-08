/**
 * Home Header Component
 *
 * Header for the HomePage with logo, settings, and mobile hamburger menu.
 * Desktop: Logo + Settings button
 * Mobile: Logo + Hamburger menu with dropdown
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Menu, X, HelpCircle, Globe, MessageSquareWarning, LogIn, LogOut } from 'lucide-react';
import { GAME_META } from '../../config/gameMeta';
import { useIsMobile } from '../../hooks/useIsMobile';
import { t } from '../../utils/translations';
import SettingsModal from './SettingsModal';
import FeedbackModal from './FeedbackModal';
import GameAuthModal from './GameAuthModal';
import GameAccountControl from './GameAccountControl';
import SimpleLanguageSelector from './SimpleLanguageSelector';
import MuteButton from './MuteButton';
import { canPlatformLogin, redirectToPlatformLogin, redirectToPlatformLogout } from '../../services/platformAuth';
import { useAuthState, isInGameAuthAvailable, signOutEverywhere } from '../../services/supabaseAuth';

interface HomeHeaderProps {
  onTutorial?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ onTutorial }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Account control on the landing screen — no room yet, so identity comes
  // straight from the shared platform session (supabaseAuth store).
  const auth = useAuthState();
  const isLoggedIn = auth.status === 'authed';
  const accountName = (auth.user?.display_name || auth.user?.username || 'Player') as string;
  const canAuth = canPlatformLogin();
  const handleLogin = () => {
    setIsMenuOpen(false);
    if (isInGameAuthAvailable()) setShowAuth(true);
    else redirectToPlatformLogin();
  };
  const handleLogout = () => {
    setIsMenuOpen(false);
    if (isInGameAuthAvailable()) void signOutEverywhere();
    else redirectToPlatformLogout();
  };

  const handleOpenSettings = () => {
    setIsMenuOpen(false);
    setShowSettings(true);
  };

  const handleOpenFeedback = () => {
    setIsMenuOpen(false);
    setShowFeedback(true);
  };

  const handleOpenTutorial = () => {
    setIsMenuOpen(false);
    if (onTutorial) {
      onTutorial();
    }
  };

  return (
    <header className="home-header">
      <a href="/" className="home-header-logo">
        <img
          src={`${import.meta.env.BASE_URL}mascot.webp`}
          alt={GAME_META.mascotAlt}
          className="home-header-mascot"
        />
        <div className="home-header-text">
          <span className="home-header-title">
            {GAME_META.namePrefix}
            <span className="home-header-accent">{GAME_META.nameAccent}</span>
          </span>
          <span className="home-header-branding">
            <span className="home-header-by">by </span>
            <span className="home-header-game">Game</span>
            <span className="home-header-buddies">Buddies</span>
            <span className="home-header-io">.io</span>
          </span>
        </div>
      </a>

      {/* Desktop: Language selector + Settings button */}
      {!isMobile && (
        <div className="home-header-controls">
          <SimpleLanguageSelector />
          <MuteButton />
          <button
            onClick={() => setShowFeedback(true)}
            className="home-header-settings-btn"
            aria-label={t('feedback.title')}
            title={t('feedback.title')}
          >
            <MessageSquareWarning className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="home-header-settings-btn"
            aria-label={t('settings.title')}
            title={t('settings.title')}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Account control — utmost right (platform convention). Guest →
              Log in / Sign up (in-game modal); logged-in → name + Log out. */}
          <GameAccountControl
            name={accountName}
            isLoggedIn={isLoggedIn}
            isPremium={auth.isPremium}
            canAuth={canAuth}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        </div>
      )}

      {/* Mobile: Mute + Hamburger menu */}
      {isMobile && (
        <div className="home-header-mobile-controls">
        <MuteButton className="home-header-mute" />
        <button
          onClick={() => setIsMenuOpen(true)}
          className="home-header-hamburger"
          aria-label={t('menus.openMenu')}
          aria-expanded={isMenuOpen}
        >
          <Menu className="w-5 h-5" />
        </button>
        </div>
      )}

      {/* Mobile menu overlay */}
      {createPortal(
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="home-header-menu-backdrop"
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Menu panel */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="home-header-menu"
              >
                {/* Header */}
                <div className="home-header-menu-header">
                  <span className="home-header-menu-title">{t('menus.menuTitle')}</span>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="home-header-menu-close"
                    aria-label={t('menus.closeMenu')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Menu items */}
                <div className="home-header-menu-items">
                  {/* Language */}
                  <div className="home-header-menu-item">
                    <div className="home-header-menu-icon">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="home-header-menu-content">
                      <span className="home-header-menu-label">{t('settings.language')}</span>
                      <SimpleLanguageSelector />
                    </div>
                  </div>

                  {/* How to Play */}
                  <button
                    onClick={handleOpenTutorial}
                    className="home-header-menu-item"
                  >
                    <div className="home-header-menu-icon">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="home-header-menu-content">
                      <span className="home-header-menu-label">{t('homeMenu.howToPlay')}</span>
                      <span className="home-header-menu-sublabel">{t('homeMenu.learnTheRules')}</span>
                    </div>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={handleOpenSettings}
                    className="home-header-menu-item"
                  >
                    <div className="home-header-menu-icon">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="home-header-menu-content">
                      <span className="home-header-menu-label">{t('settings.title')}</span>
                      <span className="home-header-menu-sublabel">{t('homeMenu.soundAndPreferences')}</span>
                    </div>
                  </button>

                  {/* Report a problem */}
                  <button
                    onClick={handleOpenFeedback}
                    className="home-header-menu-item"
                  >
                    <div className="home-header-menu-icon">
                      <MessageSquareWarning className="w-4 h-4" />
                    </div>
                    <div className="home-header-menu-content">
                      <span className="home-header-menu-label">{t('feedback.menuLabel')}</span>
                      <span className="home-header-menu-sublabel">{t('feedback.intro')}</span>
                    </div>
                  </button>

                  {/* Account — Log in / Sign up (guest) or Log out (account) */}
                  {canAuth && !isLoggedIn && (
                    <button onClick={handleLogin} className="home-header-menu-item">
                      <div className="home-header-menu-icon">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div className="home-header-menu-content">
                        <span className="home-header-menu-label">{t('menu.login')}</span>
                        <span className="home-header-menu-sublabel">{t('menu.loginSublabel')}</span>
                      </div>
                    </button>
                  )}
                  {canAuth && isLoggedIn && (
                    <button onClick={handleLogout} className="home-header-menu-item">
                      <div className="home-header-menu-icon">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="home-header-menu-content">
                        <span className="home-header-menu-label">{t('menu.logout')}</span>
                        <span className="home-header-menu-sublabel">{accountName}</span>
                      </div>
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* In-game login/signup — auth without leaving the page */}
      {showAuth && <GameAuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
};

export default HomeHeader;
