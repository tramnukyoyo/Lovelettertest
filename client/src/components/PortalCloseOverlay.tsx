/**
 * PortalCloseOverlay - Beautiful return transition to GameBuddies
 *
 * Shows a visually stunning portal effect with countdown when returning
 * to the GameBuddies lobby. Features colorful particles, rotating rings,
 * and smooth animations.
 */

import React, { useEffect, useState } from 'react';
import { getTranslation, getCurrentLanguage } from '../utils/translations';
import './PortalCloseOverlay.css';

interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PortalCloseOverlayProps {
  isVisible: boolean;
  isGroupReturn?: boolean;
  players?: Player[];
  onComplete: () => void;
  duration?: number;
  logoUrl?: string;
}

const PortalCloseOverlay: React.FC<PortalCloseOverlayProps> = ({
  isVisible,
  isGroupReturn = false,
  players = [],
  onComplete,
  duration = 3000,
  logoUrl,
}) => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);
  const [progress, setProgress] = useState(0);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000));

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * progress;

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setIsCollapsing(false);
      setCountdown(Math.ceil(duration / 1000));
      return;
    }

    const startTime = Date.now();

    const animationFrame = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);

      const remainingMs = Math.max(0, duration - elapsed);
      const newCountdown = Math.ceil(remainingMs / 1000);
      setCountdown(newCountdown);

      if (newProgress < 1) {
        requestAnimationFrame(animationFrame);
      } else {
        // Countdown finished, now collapse
        setIsCollapsing(true);
        setTimeout(() => onComplete(), 500);
      }
    };

    // Small delay before starting animation
    const timeoutId = setTimeout(() => requestAnimationFrame(animationFrame), 100);
    return () => clearTimeout(timeoutId);
  }, [isVisible, duration, onComplete]);

  useEffect(() => {
    if (isVisible) {
      const roomCode = sessionStorage.getItem('gamebuddies_roomCode') || new URLSearchParams(window.location.search).get('room') || '';
      const playerName = sessionStorage.getItem('gamebuddies_playerName') || new URLSearchParams(window.location.search).get('name') || '';
      sessionStorage.setItem('gamebuddies_returning', JSON.stringify({ fromGame: true, roomCode, playerName, isGroupReturn, timestamp: Date.now() }));
    }
  }, [isVisible, isGroupReturn]);

  if (!isVisible && !isCollapsing) return null;

  return (
    <div
      className={`portal-overlay ${isVisible ? 'visible' : ''} ${isCollapsing ? 'collapsing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-message"
    >
      <div className="sr-only" aria-live="polite">
        {t('return.returningSeconds').replace('{seconds}', String(countdown))}
      </div>

      {/* Floating particles that converge to center */}
      <div className="portal-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="portal-particle" />
        ))}
      </div>

      <div className="portal-ring-container">
        {/* Multi-layered glow */}
        <div className="portal-glow" />

        {/* Rotating outer rings */}
        <div className="portal-outer-ring portal-outer-ring-1" />
        <div className="portal-outer-ring portal-outer-ring-2" />
        <div className="portal-outer-ring portal-outer-ring-3" />

        {/* Progress ring */}
        <svg className="portal-ring" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="portalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b9d" />
              <stop offset="33%" stopColor="#c084fc" />
              <stop offset="66%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <circle className="portal-ring-bg" cx="90" cy="90" r={radius} />
          <circle
            className="portal-ring-progress"
            cx="90"
            cy="90"
            r={radius}
            style={{ strokeDashoffset }}
          />
        </svg>

        {/* Logo */}
        <div className="portal-logo">
          {logoUrl ? (
            <img src={logoUrl} alt="GameBuddies" />
          ) : (
            <span className="portal-logo-fallback">🎮</span>
          )}
        </div>

        {/* Countdown badge */}
        <div className="portal-countdown" aria-hidden="true">
          {countdown}
        </div>
      </div>

      {/* Message */}
      <p className="portal-message" id="portal-message">
        {isGroupReturn ? t('return.returningEveryone') : t('return.returningToGameBuddies')}
      </p>

      {/* Player avatars for group return */}
      {isGroupReturn && players.length > 0 && (
        <div className="portal-players">
          {players.slice(0, 6).map((player) => (
            <div
              key={player.id}
              className="portal-player-avatar"
              title={player.name}
            >
              {player.avatarUrl ? (
                <img src={player.avatarUrl} alt={player.name} />
              ) : (
                player.name.charAt(0).toUpperCase()
              )}
            </div>
          ))}
          {players.length > 6 && (
            <div className="portal-player-avatar">+{players.length - 6}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortalCloseOverlay;
