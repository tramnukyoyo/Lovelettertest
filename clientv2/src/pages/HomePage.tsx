/**
 * Home Page — Bluffalo
 *
 * Landing page with game show branding. Single adaptive card for Create/Join.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Lightbulb, ExternalLink, Share2 } from 'lucide-react';
import { GAME_META } from '../config/gameMeta';
import { HomeHeader, FloatingLabelInput, JoinFromInviteModal } from '../components/core';
import { getCurrentSession } from '../services/gameBuddiesSession';
import { t } from '../utils/translations';

interface HomePageProps {
  onCreateRoom: (playerName: string, streamerMode?: boolean) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onJoinWithInvite?: (inviteToken: string, playerName: string) => void;
  isConnecting?: boolean;
  error?: string | null;
}

const HomePage: React.FC<HomePageProps> = ({
  onCreateRoom,
  onJoinRoom,
  onJoinWithInvite,
  isConnecting = false,
  error
}) => {
  const [playerName, setPlayerName] = useState('');
  const [joinMode, setJoinMode] = useState<{ roomCode: string } | null>(null);
  const [streamerMode, setStreamerMode] = useState(false);
  const [isFromGameBuddies, setIsFromGameBuddies] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite') || urlParams.get('room') || urlParams.get('join');

    if (inviteCode) {
      if (inviteCode.length > 10) {
        setInviteToken(inviteCode);
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
      setJoinMode({ roomCode: inviteCode.toUpperCase() });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const session = getCurrentSession();
    if (session) {
      setIsFromGameBuddies(true);
      if (session.playerName) setPlayerName(session.playerName);
      if (session.isStreamerMode) setStreamerMode(true);
    }
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onCreateRoom(playerName.trim(), streamerMode);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && joinMode?.roomCode) {
      onJoinRoom(joinMode.roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const handleInviteJoin = (name: string) => {
    if (inviteToken && onJoinWithInvite) {
      onJoinWithInvite(inviteToken, name);
    }
  };

  return (
    <div className="home-page">
      <HomeHeader />

      {/* GameBuddies Integration Banner */}
      {isFromGameBuddies && (
        <div className="home-gb-banner">
          <ExternalLink className="w-4 h-4" />
          <span>{t('home.gameBuddiesBanner')}</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="home-hero">
        <img
          src={`${import.meta.env.BASE_URL}mascot.webp`}
          alt={GAME_META.mascotAlt}
          className="home-mascot"
        />
        <h1 className="home-title">
          {GAME_META.namePrefix}
          <span className="home-title-accent">{GAME_META.nameAccent}</span>
        </h1>
        <p className="home-tagline">{GAME_META.tagline}</p>
        <p className="home-gb-branding">
          <span className="home-gb-by">by </span>
          <span className="home-gb-game">Game</span>
          <span className="home-gb-buddies">Buddies</span>
          <span className="home-gb-io">.io</span>
        </p>
      </div>

      {/* Multiplayer Badge */}
      <div className="home-mp-badge">
        <Users className="w-4 h-4" />
        <span className="home-mp-badge-count">
          {t('home.multiplayerBadge', { min: GAME_META.minPlayers, max: GAME_META.maxPlayers })}
        </span>
        <span className="home-mp-badge-sep">|</span>
        <span className="home-mp-badge-category">{GAME_META.category || 'Party Game'}</span>
      </div>

      {/* How It Works Strip */}
      <div className="home-steps">
        <div className="home-step">
          <span className="home-step-icon"><Plus className="w-4 h-4" /></span>
          <span className="home-step-text">{t('home.step1Title')}</span>
        </div>
        <span className="home-step-arrow">&rarr;</span>
        <div className="home-step">
          <span className="home-step-icon"><Share2 className="w-4 h-4" /></span>
          <span className="home-step-text">{t('home.step2Title')}</span>
        </div>
        <span className="home-step-arrow">&rarr;</span>
        <div className="home-step">
          <span className="home-step-icon"><Users className="w-4 h-4" /></span>
          <span className="home-step-text">{t('home.step3Title')}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="home-error">
          <p>{error}</p>
        </div>
      )}

      {/* Single Adaptive Card */}
      <div className="home-cards-wrapper">
        <div className="home-cards" ref={cardsRef}>
          <div
            className="card home-card"
            aria-label={joinMode ? t('home.joinRoom') : t('home.createRoom')}
          >
            <p className="card-description">
              {joinMode ? t('home.joinDescription') : t('home.createDescription')}
            </p>
            <form onSubmit={joinMode ? handleJoin : handleCreate} className="home-form">
              <FloatingLabelInput
                label={t('home.yourName')}
                value={playerName}
                onChange={setPlayerName}
                maxLength={20}
                required
              />
              {!joinMode && (
                <label className="home-checkbox-label">
                  <input
                    type="checkbox"
                    checked={streamerMode}
                    onChange={(e) => setStreamerMode(e.target.checked)}
                    className="home-checkbox"
                  />
                  <span className="home-checkbox-text">{t('home.streamerMode')}</span>
                </label>
              )}
              <button
                type="submit"
                disabled={isConnecting || !playerName.trim()}
                className={`home-btn ${joinMode ? 'secondary' : 'primary'}`}
              >
                {isConnecting
                  ? t('common.loading')
                  : joinMode
                    ? t('home.joinRoom')
                    : t('home.createRoom')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="home-tip-banner">
        <Lightbulb className="w-4 h-4" />
        <span>{t('home.multiplayerTip')}</span>
      </div>

      {/* Invite Modal */}
      {inviteToken && (
        <JoinFromInviteModal
          inviteToken={inviteToken}
          onClose={() => setInviteToken(null)}
          onJoin={handleInviteJoin}
          isConnecting={isConnecting}
          error={error}
        />
      )}
    </div>
  );
};

export default HomePage;
