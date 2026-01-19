import React, { useEffect, useState } from 'react';
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
  duration?: number; // Total duration in ms, default 3000
  logoUrl?: string;
}

/**
 * PortalCloseOverlay - Animated portal effect for returning to GameBuddies
 *
 * Shows a cyberpunk-styled countdown ring that depletes clockwise,
 * with the GameBuddies logo pulsing at center. On completion,
 * triggers a "collapse" animation before calling onComplete.
 */
const PortalCloseOverlay: React.FC<PortalCloseOverlayProps> = ({
  isVisible,
  isGroupReturn = false,
  players = [],
  onComplete,
  duration = 3000,
  logoUrl,
}) => {
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000));

  // Calculate SVG ring circumference and offset
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * progress;

  // Handle the countdown animation
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setIsCollapsing(false);
      setCountdown(Math.ceil(duration / 1000));
      return;
    }

    const startTime = Date.now();
    const animationDuration = duration - 300; // Reserve 300ms for collapse

    const animationFrame = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / animationDuration, 1);
      setProgress(newProgress);

      // Update countdown number
      const remainingMs = Math.max(0, animationDuration - elapsed);
      setCountdown(Math.ceil(remainingMs / 1000));

      if (newProgress < 1) {
        requestAnimationFrame(animationFrame);
      } else {
        // Ring depleted, start collapse
        setIsCollapsing(true);
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    };

    // Start after a small delay for fade-in
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(animationFrame);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isVisible, duration, onComplete]);

  // Set return data to sessionStorage before redirect
  useEffect(() => {
    if (isVisible) {
      const roomCode = sessionStorage.getItem('gamebuddies_roomCode') ||
        new URLSearchParams(window.location.search).get('room') ||
        '';
      const playerName = sessionStorage.getItem('gamebuddies_playerName') ||
        new URLSearchParams(window.location.search).get('name') ||
        '';

      sessionStorage.setItem('gamebuddies_returning', JSON.stringify({
        fromGame: true,
        roomCode,
        playerName,
        isGroupReturn,
        timestamp: Date.now(),
      }));
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
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        Returning to GameBuddies in {countdown} seconds
      </div>

      <div className="portal-ring-container">
        {/* Outer glow effect */}
        <div className="portal-glow" />

        {/* SVG Countdown Ring - Using HeartsGambit's cyan/purple theme */}
        <svg className="portal-ring" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="portalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5cf4ff" />
              <stop offset="50%" stopColor="#b18cff" />
              <stop offset="100%" stopColor="#5cf4ff" />
            </linearGradient>
          </defs>
          {/* Background ring */}
          <circle
            className="portal-ring-bg"
            cx="90"
            cy="90"
            r={radius}
          />
          {/* Progress ring (depletes clockwise) */}
          <circle
            className="portal-ring-progress"
            cx="90"
            cy="90"
            r={radius}
            style={{ strokeDashoffset }}
          />
        </svg>

        {/* Center Logo */}
        <div className="portal-logo">
          {logoUrl ? (
            <img src={logoUrl} alt="GameBuddies" />
          ) : (
            <span className="portal-logo-fallback">🎮</span>
          )}
        </div>

        {/* Countdown number */}
        <div className="portal-countdown" aria-hidden="true">
          {countdown}
        </div>
      </div>

      {/* Message */}
      <p className="portal-message" id="portal-message">
        {isGroupReturn ? 'Returning everyone to lobby...' : 'Returning to GameBuddies...'}
      </p>

      {/* Group return: show player avatars */}
      {isGroupReturn && players.length > 0 && (
        <div className="portal-players">
          {players.slice(0, 6).map((player, index) => (
            <div
              key={player.id}
              className="portal-player-avatar"
              style={{ animationDelay: `${index * 0.1}s` }}
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
            <div className="portal-player-avatar">
              +{players.length - 6}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortalCloseOverlay;
