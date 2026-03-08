/**
 * PassPlayToggle
 *
 * Lobby component for toggling between Online and Pass & Play modes.
 * When Pass & Play is active, shows a player name input and list of added players.
 * Host only -- guests see a read-only label.
 */

import React, { useState, useCallback } from 'react';
import { Wifi, Smartphone, UserPlus, X, Users } from 'lucide-react';
import type { BasePlayer } from '../../types';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

interface PassPlayToggleProps {
  isPassPlay: boolean;
  isHost: boolean;
  players: BasePlayer[];
  maxPlayers: number;
  onToggleMode: (enabled: boolean) => void;
  onAddPlayer: (name: string) => Promise<{ success: boolean; message?: string }>;
  onRemovePlayer: (playerId: string) => void;
}

const PassPlayToggle: React.FC<PassPlayToggleProps> = ({
  isPassPlay,
  isHost,
  players,
  maxPlayers,
  onToggleMode,
  onAddPlayer,
  onRemovePlayer,
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const lang = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, lang);

  const passPlayPlayers = players.filter(p => p.isPassPlayPlayer);

  const handleAddPlayer = useCallback(async () => {
    const name = newPlayerName.trim();
    if (!name) return;

    setIsAdding(true);
    setError('');

    const result = await onAddPlayer(name);
    if (result.success) {
      setNewPlayerName('');
    } else {
      setError(result.message || t('passPlay.addFailed'));
    }
    setIsAdding(false);
  }, [newPlayerName, onAddPlayer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPlayer();
    }
  }, [handleAddPlayer]);

  if (!isHost) {
    // Non-host: just show the current mode
    if (!isPassPlay) return null;
    return (
      <div className="pp-mode-label">
        <Smartphone className="w-4 h-4" />
        <span>{t('passPlay.passAndPlay')}</span>
      </div>
    );
  }

  return (
    <div className="pp-toggle-section">
      {/* Mode Toggle */}
      <div className="pp-toggle-buttons">
        <button
          className={`pp-toggle-btn ${!isPassPlay ? 'active' : ''}`}
          onClick={() => onToggleMode(false)}
          type="button"
        >
          <Wifi className="w-4 h-4" />
          {t('passPlay.online')}
        </button>
        <button
          className={`pp-toggle-btn ${isPassPlay ? 'active' : ''}`}
          onClick={() => onToggleMode(true)}
          type="button"
        >
          <Smartphone className="w-4 h-4" />
          {t('passPlay.passAndPlay')}
        </button>
      </div>

      {/* Pass & Play Player Management */}
      {isPassPlay && (
        <div className="pp-player-management">
          {/* Add Player Input */}
          <div className="pp-add-player">
            <input
              type="text"
              className="pp-player-input"
              value={newPlayerName}
              onChange={e => { setNewPlayerName(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder={t('passPlay.enterPlayerName')}
              maxLength={20}
              disabled={isAdding || players.length >= maxPlayers}
            />
            <button
              className="pp-add-btn"
              onClick={handleAddPlayer}
              disabled={!newPlayerName.trim() || isAdding || players.length >= maxPlayers}
              type="button"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {error && <p className="pp-error">{error}</p>}

          {/* Player Count */}
          <p className="pp-player-count">
            <Users className="w-3 h-3" />
            {players.length}/{maxPlayers} {t('lobby.players')}
          </p>

          {/* Virtual Player List */}
          {passPlayPlayers.length > 0 && (
            <div className="pp-player-list">
              {passPlayPlayers.map(player => (
                <div key={player.id} className="pp-player-item">
                  <span className="pp-player-name">{player.name}</span>
                  <button
                    className="pp-remove-btn"
                    onClick={() => player.id && onRemovePlayer(player.id)}
                    title={t('passPlay.removePlayer')}
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PassPlayToggle;
