import React, { useState, useEffect, useRef } from 'react';
import { getCurrentSession, resolvePendingSession } from '../services/gameBuddiesSession';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import Header from '../components/Header';
import TutorialCarousel, { TutorialButton } from '../components/TutorialCarousel';
import { GAME_META } from '../config/gameMeta';
import { playEliminatedSound } from '../utils/soundEffects';
import { useTypewriterSound } from '../hooks/useTypewriterSound';
import { getTranslation, getCurrentLanguage } from '../utils/translations';

interface HomePageProps {
  onCreateRoom: (playerName: string, session: GameBuddiesSession | null, streamerMode: boolean) => void;
  onJoinRoom: (roomCode: string, playerName: string, session: GameBuddiesSession | null) => void;
  gameBuddiesSession: GameBuddiesSession | null;
}

const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, gameBuddiesSession }) => {
  const [playerName, setPlayerName] = useState('');
  const [joinMode, setJoinMode] = useState<{ roomCode: string } | null>(null);
  const [streamerMode, setStreamerMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { onKeyDown: typewriterKeyDown } = useTypewriterSound();
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as keyof typeof import('../utils/translations').translations.en, language);

  // Update tutorial position to align with cards
  useEffect(() => {
    const updateTutorialPosition = () => {
      if (cardsRef.current) {
        const rect = cardsRef.current.getBoundingClientRect();
        document.documentElement.style.setProperty('--tutorial-top', `${rect.top}px`);
      }
    };

    updateTutorialPosition();
    window.addEventListener('resize', updateTutorialPosition);
    window.addEventListener('scroll', updateTutorialPosition);

    return () => {
      window.removeEventListener('resize', updateTutorialPosition);
      window.removeEventListener('scroll', updateTutorialPosition);
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCodeParam = urlParams.get('join') || urlParams.get('invite');

    if (joinCodeParam) {
      if (joinCodeParam.length > 10) {
        setJoinMode({ roomCode: joinCodeParam });
      } else {
        setJoinMode({ roomCode: joinCodeParam.toUpperCase() });
      }
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const session = getCurrentSession();
    if (session) {
      setPlayerName(session.playerName || '');
      console.log('[GameBuddies] Session found, auto-join will be handled by App component');
    } else {
      resolvePendingSession().then(resolved => {
        if (resolved) {
          console.log('[GameBuddies] Pending session resolved in Home component');
        }
      });
    }
  }, [gameBuddiesSession]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      alert(t('home.pleaseEnterName'));
      return;
    }

    console.log('[Home] Creating room with session:', gameBuddiesSession);
    playEliminatedSound();
    onCreateRoom(playerName, gameBuddiesSession, streamerMode);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      alert(t('home.pleaseEnterName'));
      return;
    }

    if (!joinMode || !joinMode.roomCode.trim()) {
      alert(t('home.pleaseEnterRoomCode'));
      return;
    }

    // Only uppercase if it's a standard room code (short)
    // Invite tokens (UUIDs) are case-sensitive and longer
    const codeToSend = joinMode.roomCode.length > 10 ? joinMode.roomCode : joinMode.roomCode.toUpperCase();
    console.log('[Home] Joining room with session:', gameBuddiesSession);
    playEliminatedSound();
    onJoinRoom(codeToSend, playerName, gameBuddiesSession);
  };

  return (
    <>
      <Header />
      <div className="home-hero">
        <div className="home-shell">
          <div className="home-header">
            <div className="home-mascot-container">
              <img
                src="https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/primesuspect.webp"
                alt={GAME_META.mascotAlt}
                className="home-mascot-anim"
              />
            </div>
            <span className="eyebrow">{t('home.deductionCardGame')}</span>
            <h1>{GAME_META.name}</h1>
            <p className="home-tagline">{GAME_META.tagline}</p>
            <div className="tutorial-mobile-trigger">
              <TutorialButton onClick={() => setShowTutorial(true)} />
            </div>
          </div>

          {gameBuddiesSession && (
            <div className="home-tip-banner">
              <span role="img" aria-label="streamer">🎙️</span>
              <span>
                {gameBuddiesSession.isStreamerMode
                  ? t('home.streamerModeEnabled')
                  : t('home.linkedWithGameBuddies')}
              </span>
            </div>
          )}

          <div className="home-cards-wrapper">
            <div className="split-actions" ref={cardsRef}>
              <div className="split-card">
                <div className="card-head">
                  <h3>{joinMode ? t('home.joinRoom') : t('home.createRoom')}</h3>
                  <p>{joinMode ? t('home.joinRoomDescription') : t('home.createRoomDescription')}</p>
                </div>
                <form onSubmit={joinMode ? handleJoinSubmit : handleCreateSubmit} className="home-form">
                  <div className="form-group">
                    <label>{t('home.yourName')}</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onKeyDown={typewriterKeyDown}
                      placeholder={t('home.enterYourName')}
                      maxLength={20}
                      required
                      className="home-input"
                    />
                  </div>
                  {!joinMode && (
                    <label className="streamer-toggle">
                      <input
                        type="checkbox"
                        checked={streamerMode}
                        onChange={(e) => setStreamerMode(e.target.checked)}
                      />
                      <span>{t('home.streamerMode')}</span>
                    </label>
                  )}
                  <button type="submit" className={`primary-cta ${joinMode ? 'join-cta' : 'create-cta'}`}>
                    {joinMode ? t('home.joinRoom') : t('home.createRoom')}
                  </button>
                </form>
              </div>
            </div>
            <TutorialCarousel variant="sidebar" />
          </div>

          <div className="home-tip-banner" role="status" aria-live="polite">
            <span role="img" aria-label="tip">📡</span>
            {t('home.shareTip')}
          </div>
        </div>
      </div>

      {/* Mobile modal tutorial - triggered by button */}
      <TutorialCarousel
        variant="modal"
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </>
  );
};

export default HomePage;
