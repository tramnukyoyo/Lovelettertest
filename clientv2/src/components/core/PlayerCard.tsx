/**
 * PlayerCard — platform-identity modal, mirroring gamebuddies.io's
 * ProfilePeekModal (banner → overlapping framed avatar → flair name → stat
 * grid → achievements). 1:1 port from the canonical Lightwall client.
 *
 * Data arrives async via the `gb:player:profile` socket event into the
 * playerProfiles store; without a profile (guests, platform unreachable) the
 * card simply doesn't open.
 */

import React, { useEffect } from 'react';
import { usePlayerProfile } from '../../services/playerProfiles';
import { cosmeticClass } from '../../utils/cosmetics';
import { t } from '../../utils/translations';
import type { Player } from '../../types';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  onClose: () => void;
}

const RARITY_BADGE_COLOR: Record<string, string> = {
  legendary: '#ffd166',
  epic: '#ce71ff',
  rare: '#4ea7ea',
  common: '#c0c0c0',
};

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClose }) => {
  const profile = usePlayerProfile(player.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!profile) return null;

  const bannerClass = cosmeticClass(profile.cosmetics.bannerId) || 'banner-default';
  const frameClass = cosmeticClass(profile.cosmetics.frameId);
  const flairClass = cosmeticClass(profile.cosmetics.flairId);

  return (
    <div className="player-card-overlay" onClick={onClose}>
      <div className="player-card" onClick={(e) => e.stopPropagation()}>
        <button className="player-card-close" onClick={onClose} type="button" aria-label={t('common.close')}>
          ×
        </button>

        {/* Banner with gradient fade into the card (profile-peek pattern) */}
        <div className={`player-card-banner profile-banner ${bannerClass}`}>
          <div className="player-card-banner-overlay" />
        </div>

        {/* Identity: framed avatar overlapping the banner */}
        <div className="player-card-identity">
          <div
            className={`player-card-avatar avatar-frame-wrap ${frameClass}`}
            style={{ ['--frame-ring' as string]: '5px' }}
          >
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.name} className="player-card-avatar-img" />
            ) : (
              <div className="player-card-avatar-img player-card-avatar-placeholder">
                {player.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="player-card-name-row">
            <span className={`player-card-username ${flairClass}`}>{player.name}</span>
          </div>
          <div className="player-card-meta">
            {t('playerCard.level', { level: profile.level })} · {profile.progressPercent}%
          </div>
        </div>

        {/* Stat grid (profile-peek layout) */}
        <div className="player-card-stats">
          <div className="player-card-stat">
            <div className="player-card-stat-value">{profile.level}</div>
            <div className="player-card-stat-label">Level</div>
          </div>
          <div className="player-card-stat">
            <div className="player-card-stat-value">{profile.gabuPoints}</div>
            <div className="player-card-stat-label">GP</div>
          </div>
          <div className="player-card-stat">
            <div className="player-card-stat-value">🔥 {profile.dailyStreak}</div>
            <div className="player-card-stat-label">{t('playerCard.dailyStreak')}</div>
          </div>
          {profile.gameStats && (
            <div className="player-card-stat">
              <div className="player-card-stat-value">{profile.gameStats.wins}/{profile.gameStats.plays}</div>
              <div className="player-card-stat-label">{t('playerCard.winsInGame')}</div>
            </div>
          )}
        </div>

        {profile.achievements.recent.length > 0 && (
          <div className="player-card-achievements">
            <div className="player-card-section-label">
              {t('playerCard.achievements', { count: profile.achievements.count })}
            </div>
            <div className="player-card-achievement-row">
              {profile.achievements.recent.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="player-card-achievement"
                  title={a.name}
                  style={{ borderColor: RARITY_BADGE_COLOR[a.rarity] || undefined }}
                >
                  {a.iconUrl
                    ? <img src={a.iconUrl} alt={a.name} />
                    : <span className="player-card-achievement-fallback">★</span>}
                  <div className="player-card-achievement-name">{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
