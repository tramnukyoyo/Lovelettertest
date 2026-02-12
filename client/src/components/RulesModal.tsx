import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getTranslatedCardDatabase } from './hearts-gambit/cardDatabase';
import { getCurrentLanguage } from '../utils/translations';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const language = getCurrentLanguage();
  const cards = getTranslatedCardDatabase(language);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Detailed rules per card (keyed by card value)
  const detailedRules: Record<number, string> = {
    1: 'Choose another player and name a number between 2 and 8. If that player holds a card with that number, they are immediately eliminated. If you guess wrong, nothing happens. You cannot guess "1" (Inspector). If all other players are protected by the Lawyer, the Inspector is played without effect.',
    2: 'Secretly look at another player\'s card. Do not reveal it to anyone else. Use this knowledge wisely on future turns.',
    3: 'Choose another player. Both of you secretly compare your cards. The player holding the lower number is eliminated from the round. In case of a tie, nothing happens.',
    4: 'You are immune to all other players\' card effects until the start of your next turn. If all other players are protected by the Lawyer, the current player must target themselves with card effects that require choosing a player.',
    5: 'Choose any player still in the round (including yourself). That player discards their card without applying its effect (unless it is The Murderer) and draws a new card from the case file. If the case file is empty, the player draws the card set aside at the start. If all other players are protected, you must choose yourself.',
    6: 'Trade the card in your hand with another player\'s card. You cannot trade with an eliminated player.',
    7: 'If you ever hold the Accomplice together with the Blackmailer (5) or the Double Agent (6), you must discard the Accomplice. You do not need to reveal your other card.',
    8: 'If you discard The Murderer for any reason — whether by choice or forced by another card — you are immediately eliminated from the round.',
  };

  return createPortal(
    <div
      className="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="settings-modal-panel hg-panel hg-candlelight rules-panel"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <div className="settings-modal-title">
            <div className="settings-modal-eyebrow">Case Briefing</div>
            <h2 id="rules-modal-title">Rules</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="settings-modal-content rules-content">
          {/* The Case */}
          <div className="rules-section">
            <div className="rules-section-title">The Case</div>
            <p className="rules-text">
              You are a detective working a murder case. Each round, you hold a single card — your lead suspect. Draw a new card each turn, play one, and use its effect to gather intel, eliminate opponents, or protect yourself.
            </p>
            <p className="rules-text" style={{ fontStyle: 'italic', opacity: 0.7 }}>
              Deduce what the others are holding. Accuse, protect, spy, and bluff your way to the truth.
            </p>
          </div>

          <div className="rules-divider" />

          {/* Taking a Turn */}
          <div className="rules-section">
            <div className="rules-section-title">Taking a Turn</div>
            <ol className="rules-steps">
              <li><strong>Draw</strong> the top card from the case file. You now hold 2 cards.</li>
              <li><strong>Play one</strong> of your two cards face up in front of you.</li>
              <li><strong>Apply its effect.</strong> You must apply the effect, even if it hurts you.</li>
            </ol>
          </div>

          <div className="rules-divider" />

          {/* Cards Overview */}
          <div className="rules-section">
            <div className="rules-section-title">Cards Overview</div>
            <div className="rules-card-grid">
              <div className="rules-card-row rules-card-row-header">
                <span className="rules-card-num">#</span>
                <span className="rules-card-name">Name</span>
                <span className="rules-card-copies">Copies</span>
                <span className="rules-card-effect">Effect</span>
              </div>
              {cards.map((card) => (
                <div key={card.id} className="rules-card-row">
                  <span className="rules-card-num">{card.value}</span>
                  <span className="rules-card-name">{card.name}</span>
                  <span className="rules-card-copies">&times;{card.copies}</span>
                  <span className="rules-card-effect">{card.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rules-divider" />

          {/* End of Round */}
          <div className="rules-section">
            <div className="rules-section-title">End of Round</div>
            <p className="rules-text">
              <strong>Last One Standing:</strong> All players but one have been eliminated. The remaining player wins the round.
            </p>
            <p className="rules-text">
              <strong>Case File Empty:</strong> The deck runs out at the end of a player's turn. All remaining players reveal their cards. The player with the highest number wins. Tied? Add up all played card values — highest total wins.
            </p>
          </div>

          <div className="rules-divider" />

          {/* Winning the Game */}
          <div className="rules-section">
            <div className="rules-section-title">Winning the Game</div>
            <p className="rules-text">The first player to collect enough tokens wins:</p>
            <table className="rules-token-table">
              <thead>
                <tr><th>Players</th><th>Tokens to Win</th></tr>
              </thead>
              <tbody>
                <tr><td>2 Players</td><td><span className="rules-token-dot" /> 7</td></tr>
                <tr><td>3 Players</td><td><span className="rules-token-dot" /> 5</td></tr>
                <tr><td>4 Players</td><td><span className="rules-token-dot" /> 4</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rules-divider" />

          {/* Detailed Card Rules */}
          <div className="rules-section">
            <div className="rules-section-title">Detailed Card Rules</div>
            {[...cards].reverse().map((card) => (
              <div key={card.id} className="rules-card-detail">
                <div className="rules-card-detail-img">
                  <img src={card.image} alt={card.name} />
                </div>
                <div className="rules-card-detail-body">
                  <div className="rules-card-detail-header">
                    <span className="rules-cd-number">{card.value}</span>
                    <span className="rules-cd-title">{card.name}</span>
                    <span className="rules-cd-copies">&times;{card.copies} {card.copies === 1 ? 'copy' : 'copies'}</span>
                  </div>
                  <p className="rules-card-detail-effect">
                    {detailedRules[card.value] || card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Important notes */}
          <div className="rules-important">
            <div className="rules-important-label">Important</div>
            <p>If you are eliminated, reveal and discard the card in your hand face up <strong>without</strong> applying its effect.</p>
            <p>If you play a card that requires choosing a player, and all other players are protected by the Lawyer, your card is played without effect.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RulesModal;
