/**
 * Streamer Settings Panel — Bluffalo
 *
 * Single-layout settings with overlay toggles only.
 * Follows the Soundbite / CanvasChaos pattern: no layout cards.
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { getBroadcastCopy } from './broadcastCopy';

export interface BroadcastOverlays {
  timer: boolean;
  playerNames: boolean;
  phaseBadge: boolean;
  roomCode: boolean;
  chatTicker: boolean;
}

export interface BroadcastSummary {
  phaseLabel: string;
  connectedCams: number;
  connectedPlayers: number;
  roomCode: string;
  streamerMode: boolean;
}

interface StreamerSettingsPanelProps {
  overlays: BroadcastOverlays;
  onOverlaysChange: (overlays: BroadcastOverlays) => void;
  onLock: () => void;
  onClose: () => void;
  summary: BroadcastSummary;
}

const StreamerSettingsPanel: React.FC<StreamerSettingsPanelProps> = ({
  overlays,
  onOverlaysChange,
  onLock,
  onClose,
  summary,
}) => {
  const copy = getBroadcastCopy();

  const overlayOptions: Array<{ key: keyof BroadcastOverlays; label: string }> = [
    { key: 'playerNames', label: copy.settings.namesBelowVideo },
    { key: 'roomCode', label: copy.settings.showRoomCode },
    { key: 'chatTicker', label: copy.settings.showChatTicker },
  ];

  const toggleOverlay = (key: keyof BroadcastOverlays) => {
    onOverlaysChange({ ...overlays, [key]: !overlays[key] });
  };

  return (
    <div className="streamer-settings-panel">
      <div className="streamer-settings-header">
        <span className="streamer-settings-title">{copy.settings.title}</span>
        <p className="streamer-settings-subcopy">{copy.settings.subcopy}</p>
      </div>

      <div className="streamer-settings-section">
        <h4 className="streamer-settings-section-title">{copy.settings.room}</h4>
        <div className="streamer-settings-summary-list">
          <div className="streamer-settings-summary-row">
            <span>{copy.settings.code}</span>
            <strong>#{summary.roomCode}</strong>
          </div>
          <div className="streamer-settings-summary-row">
            <span>{copy.settings.phase}</span>
            <strong>{summary.phaseLabel}</strong>
          </div>
          <div className="streamer-settings-summary-row">
            <span>{copy.settings.players}</span>
            <strong>{summary.connectedPlayers}</strong>
          </div>
          <div className="streamer-settings-summary-row">
            <span>{copy.settings.cameras}</span>
            <strong>{summary.connectedCams}</strong>
          </div>
          <div className="streamer-settings-summary-row">
            <span>{copy.settings.mode}</span>
            <strong>{summary.streamerMode ? copy.settings.streamer : copy.settings.roomMode}</strong>
          </div>
        </div>
      </div>

      <div className="streamer-settings-section">
        <h4 className="streamer-settings-section-title">{copy.settings.feed}</h4>
        <div className="streamer-overlay-toggles simplified">
          {overlayOptions.map(({ key, label }) => (
            <label key={key} className="streamer-overlay-toggle">
              <input
                type="checkbox"
                checked={overlays[key]}
                onChange={() => toggleOverlay(key)}
              />
              <span className="streamer-toggle-track" />
              <span className="streamer-overlay-label">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="streamer-settings-section streamer-settings-controls">
        <button type="button" className="streamer-lock-btn" onClick={onLock}>
          <Lock className="w-4 h-4" />
          <span>{copy.settings.lockForCapture}</span>
        </button>
        <button type="button" className="streamer-close-btn" onClick={onClose}>
          <span>{copy.settings.closeWindow}</span>
        </button>
      </div>

      <div className="streamer-settings-hint">
        {copy.settings.obsHint}
      </div>
    </div>
  );
};

export default StreamerSettingsPanel;
