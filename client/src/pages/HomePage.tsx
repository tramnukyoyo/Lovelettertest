import React, { useState, useEffect, useRef } from 'react';
import { getCurrentSession, resolvePendingSession } from '../services/gameBuddiesSession';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import Header from '../components/Header';
import TutorialCarousel, { TutorialButton } from '../components/TutorialCarousel';
import { GAME_META } from '../config/gameMeta';
import { playEliminatedSound } from '../utils/soundEffects';
import { useTypewriterSound } from '../hooks/useTypewriterSound';

interface HomePageProps {
  onCreateRoom: (playerName: string, session: GameBuddiesSession | null, streamerMode: boolean) => void;
  onJoinRoom: (roomCode: string, playerName: string, session: GameBuddiesSession | null) => void;
  gameBuddiesSession: GameBuddiesSession | null;
}

const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, gameBuddiesSession }) => {
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [streamerMode, setStreamerMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { onKeyDown: typewriterKeyDown } = useTypewriterSound();

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
      setJoinCode(joinCodeParam.length > 10 ? joinCodeParam : joinCodeParam.toUpperCase());
      return;
    }

    const session = getCurrentSession();
    if (session) {
      setCreateName(session.playerName || '');
      setJoinName(session.playerName || '');
      setJoinCode(session.roomCode || '');
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

    if (!createName.trim()) {
      alert('Please enter your name');
      return;
    }

    console.log('[Home] Creating room with session:', gameBuddiesSession);
    playEliminatedSound();
    onCreateRoom(createName, gameBuddiesSession, streamerMode);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!joinCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    // Only uppercase if it's a standard room code (short)
    // Invite tokens (UUIDs) are case-sensitive and longer
    const codeToSend = joinCode.length > 10 ? joinCode : joinCode.toUpperCase();
    console.log('[Home] Joining room with session:', gameBuddiesSession);
    playEliminatedSound();
    onJoinRoom(codeToSend, joinName, gameBuddiesSession);
  };

  return (
    <>
      <Header />
      <div className="home-hero">
        <div className="home-shell">
          <div className="home-header">
            <div className="home-mascot-container">
              <img
                src={`${import.meta.env.BASE_URL}mascot.webp`}
                alt={GAME_META.mascotAlt}
                className="home-mascot-anim"
              />
            </div>
            <span className="eyebrow">Deduction Card Game</span>
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
                  ? 'Streamer mode enabled • room code hidden'
                  : 'Linked with GameBuddies – use your session to join instantly'}
              </span>
            </div>
          )}

          <div className="home-cards-wrapper">
            <div className="split-actions" ref={cardsRef}>
              <div className="split-card">
                <div className="card-head">
                  <h3>Create Room</h3>
                  <p>Start a private room and invite your players to join the sync.</p>
                </div>
                <form onSubmit={handleCreateSubmit} className="home-form">
                  <div className="form-group">
                    <label>Your name</label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      onKeyDown={typewriterKeyDown}
                      placeholder="Enter your name"
                      maxLength={20}
                      required
                      className="home-input"
                    />
                  </div>
                  <label className="streamer-toggle">
                    <input
                      type="checkbox"
                      checked={streamerMode}
                      onChange={(e) => setStreamerMode(e.target.checked)}
                    />
                    <span>Streamer Mode (hide room code)</span>
                  </label>
                  <button type="submit" className="primary-cta create-cta">
                    Create Room
                  </button>
                </form>
              </div>

              <div className="split-card">
                <div className="card-head">
                  <h3>Join Game</h3>
                  <p>Enter the room code from your host to jump into the live round.</p>
                </div>
                <form onSubmit={handleJoinSubmit} className="home-form">
                  <div className="form-group">
                    <label>Your name</label>
                    <input
                      type="text"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      onKeyDown={typewriterKeyDown}
                      placeholder="Enter your name"
                      maxLength={20}
                      required
                      className="home-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Room code</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      onKeyDown={typewriterKeyDown}
                      placeholder="Enter room code"
                      maxLength={40}
                      required
                      className="home-input"
                    />
                  </div>
                  <button type="submit" className="primary-cta join-cta">
                    Join Game
                  </button>
                </form>
              </div>
            </div>
            <TutorialCarousel variant="sidebar" />
          </div>

          <div className="home-tip-banner" role="status" aria-live="polite">
            <span role="img" aria-label="tip">📡</span>
            Share the room code or use streamer mode for safe invites.
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
