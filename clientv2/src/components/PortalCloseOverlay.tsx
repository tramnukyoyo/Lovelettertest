/**
 * PortalCloseOverlay - Beautiful return transition to GameBuddies
 *
 * Shows a visually stunning portal effect with countdown when returning
 * to the GameBuddies lobby. Features colorful particles, rotating rings,
 * and smooth animations.
 */

import React, { useEffect, useState } from 'react';
import { t } from '../utils/translations';
import { Avatar } from './core/Avatar';
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
  message?: string;
  /** Fallback player name from parent (for direct-join players who lack gamebuddies_playerName) */
  currentPlayerName?: string;
}

const PortalCloseOverlay: React.FC<PortalCloseOverlayProps> = ({
  isVisible,
  isGroupReturn = false,
  players = [],
  onComplete,
  duration = 3000,
  logoUrl,
  message,
  currentPlayerName,
}) => {
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

    let rafId: number;
    let completeTimeoutId: number;
    const startTime = Date.now();

    const animationFrame = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);

      const remainingMs = Math.max(0, duration - elapsed);
      const newCountdown = Math.ceil(remainingMs / 1000);
      setCountdown(newCountdown);

      if (newProgress < 1) {
        rafId = requestAnimationFrame(animationFrame);
      } else {
        setIsCollapsing(true);
        completeTimeoutId = window.setTimeout(() => onComplete(), 500);
      }
    };

    const timeoutId = window.setTimeout(() => {
      rafId = requestAnimationFrame(animationFrame);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      clearTimeout(completeTimeoutId);
    };
  }, [isVisible, duration, onComplete]);

  useEffect(() => {
    if (isVisible) {
      const roomCode = sessionStorage.getItem('gamebuddies_roomCode') || new URLSearchParams(window.location.search).get('room') || '';
      // Resolve player name from multiple sources (direct-join players lack gamebuddies_playerName)
      let resolvedName = sessionStorage.getItem('gamebuddies_playerName') || '';
      if (!resolvedName) {
        try {
          const gbSession = sessionStorage.getItem('gamebuddies:session');
          if (gbSession) resolvedName = JSON.parse(gbSession).playerName || '';
        } catch { /* ignore parse errors */ }
      }
      if (!resolvedName) resolvedName = currentPlayerName || '';
      if (!resolvedName) resolvedName = new URLSearchParams(window.location.search).get('name') || '';
      sessionStorage.setItem('gamebuddies_returning', JSON.stringify({ fromGame: true, roomCode, playerName: resolvedName, isGroupReturn, isHost: isGroupReturn, timestamp: Date.now() }));
    }
  }, [isVisible, isGroupReturn, currentPlayerName]);

  if (!isVisible && !isCollapsing) return null;

  return (
    <div
      className={`portal-overlay ${isVisible ? 'visible' : ''} ${isCollapsing ? 'collapsing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-message"
    >
      <div className="sr-only" aria-live="polite">
        {t('portalClose.returningCountdown', { countdown })}
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
            {/* Prairie sunset arc: sun core → cream → amber → orange */}
            <linearGradient id="portalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffe9a8" />
              <stop offset="33%" stopColor="#ffd084" />
              <stop offset="66%" stopColor="#ffb648" />
              <stop offset="100%" stopColor="#e0763c" />
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
          <img src={logoUrl || `${import.meta.env.BASE_URL}mascot.webp`} alt="GameBuddies" className="portal-logo-img" />
        </div>

        {/* Countdown badge */}
        <div className="portal-countdown" aria-hidden="true">
          {countdown}
        </div>
      </div>

      {/* Message */}
      <p className="portal-message" id="portal-message">
        {message || (isGroupReturn ? t('portalClose.returningEveryone') : t('portalClose.returningToGameBuddies'))}
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
              <Avatar src={player.avatarUrl} alt={player.name} />
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
