import React, { useState, useEffect } from 'react';
import HeartsGambitGame from '../components/hearts-gambit/HeartsGambitGame';
import HeartsGambitGameMobile from '../components/hearts-gambit/HeartsGambitGameMobile';
import { usePassPlay } from '../hooks/usePassPlay';
import { getTranslation, getCurrentLanguage } from '../utils/translations';
import { Eye, ChevronRight } from 'lucide-react';
import type { Lobby } from '../types';
import type { Socket } from 'socket.io-client';
import SpectatorBanner from '../components/core/SpectatorBanner';

interface GamePageProps {
  lobby: Lobby;
  socket: Socket;
}

const PPProgressDots: React.FC<{ currentIndex: number; total: number }> = ({ currentIndex, total }) => (
  <div className="pp-progress">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`pp-progress-dot ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}
      />
    ))}
  </div>
);

const GamePage: React.FC<GamePageProps> = ({ lobby, socket }) => {
  const [showPassModal, setShowPassModal] = useState(false);
  const [prevTurn, setPrevTurn] = useState<string | undefined>();
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  const pp = usePassPlay({
    roomCode: lobby.code,
    players: lobby.players,
    passPlay: lobby.passPlay,
    settings: lobby.settings,
    socket,
  });

  // Detect turn completion: currentTurn was my PP player → now it isn't
  useEffect(() => {
    if (!pp.isPassPlay || !pp.isRevealed || !pp.currentPlayer) return;

    const currentTurn = lobby.gameData?.currentTurn;
    const myId = pp.currentPlayer.id;

    if (prevTurn === myId && currentTurn !== myId) {
      setShowPassModal(true);
    }
    setPrevTurn(currentTurn);
  }, [lobby.gameData?.currentTurn, pp.isPassPlay, pp.isRevealed, pp.currentPlayer?.id, prevTurn]);

  // Not my turn on reveal → show pass modal after a brief view
  useEffect(() => {
    if (!pp.isPassPlay || !pp.isRevealed || !pp.currentPlayer) return;
    const isMyTurn = lobby.gameData?.currentTurn === pp.currentPlayer.id;
    if (!isMyTurn) {
      const timer = setTimeout(() => {
        setShowPassModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pp.isRevealed, pp.currentPlayer?.id]);

  // Reset on player change (advance to next PP player)
  useEffect(() => {
    setShowPassModal(false);
    setPrevTurn(undefined);
  }, [pp.currentPlayerIndex]);

  // Pass & Play during PLAYING phase — render game directly, no wrapper
  if (pp.isPassPlay && pp.currentPlayer && lobby.state === 'PLAYING') {
    // Before reveal: lightweight transition screen
    if (!pp.isRevealed) {
      return (
        <div className="pp-transition-screen">
          <p className="pp-pass-label">{t('passPlay.passDeviceTo')}</p>
          <h2 className="pp-player-name-display">{pp.currentPlayer.name}</h2>
          <div className="pp-privacy-card">
            <span className="pp-privacy-icon">🔒</span>
            <span className="pp-privacy-text">
              {t('passPlay.onlyPlayerLooking').replace('{name}', pp.currentPlayer.name)}
            </span>
          </div>
          <button className="pp-reveal-btn" onClick={pp.reveal}>
            <Eye size={20} /> {t('passPlay.reveal')}
          </button>
          <PPProgressDots currentIndex={pp.currentPlayerIndex} total={lobby.passPlay?.turnOrder.length ?? 0} />
        </div>
      );
    }

    // After reveal: render the EXACT same game component — no wrapper
    return (
      <>
        <HeartsGambitGameMobile
          lobby={lobby}
          socket={socket}
          ppActivePlayerId={pp.currentPlayer.id}
          ppActionHandler={pp.action}
        />
        {showPassModal && (
          <div className="pp-advance-modal">
            <div className="pp-advance-modal-card">
              <span className="pp-advance-check">&#10003;</span>
              <p className="pp-advance-label">{t('passPlay.actionSubmitted')}</p>
              <button className="pp-advance-btn" onClick={pp.advance}>
                <ChevronRight size={20} />
                {t('passPlay.donePassDevice')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  const isSpectator = lobby.players.find(p => p.socketId === lobby.mySocketId)?.isSpectator || false;

  // Internal game state routing - handles all game phases
  switch (lobby.state) {
    // Prime Suspect States
    case 'LOBBY':
    case 'PLAYING':
    case 'ENDED':
      return (
        <>
          {isSpectator && <SpectatorBanner />}
          <HeartsGambitGame lobby={lobby} socket={socket} />
        </>
      );

    default:
      return <div>Unknown game state: {lobby.state}</div>;
  }
};

export default GamePage;
