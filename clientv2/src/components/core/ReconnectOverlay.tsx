/**
 * ReconnectOverlay - Shown when a game is restored after server restart.
 * Displays reconnection progress and a resume button for the host.
 *
 * Same case-file language as FreezeOverlay: wax-seal mark, typewriter eyebrow,
 * Cinzel title, gold hairlines. The 🔄 emoji glyphs it used to render (owner
 * directive: no emoji as UI chrome) are lucide icons, and the unlabelled
 * emoji-only escape button — which was squeezed into the same flex ROW as
 * "Waiting for host to resume…" because `marginTop` cannot push a child out of
 * a row — is now a labelled button on its own line.
 */

import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { t } from '../../utils/translations';
import './ReconnectOverlay.css';

/** t() returns the key itself on a miss, so `t(k) || fallback` NEVER fires. */
function tr(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

interface ReconnectOverlayProps {
  phase: string;
  connectedCount: number;
  totalPlayers: number;
  isHost: boolean;
  onResume: () => void;
}

const ReconnectOverlay: React.FC<ReconnectOverlayProps> = ({
  phase,
  connectedCount,
  totalPlayers,
  isHost,
  onResume,
}) => {
  const [dismissing, setDismissing] = useState(false);
  const [waitedTooLong, setWaitedTooLong] = useState(false);

  useEffect(() => {
    if (isHost) { setWaitedTooLong(false); return; }
    const id = setTimeout(() => setWaitedTooLong(true), 25000);
    return () => clearTimeout(id);
  }, [isHost]);

  const handleResume = () => {
    setDismissing(true);
    setTimeout(onResume, 300);
  };

  // One mark per player: filled gold = back at the table, hollow = still out.
  const dots = Array.from({ length: totalPlayers }, (_, i) => (
    <div
      key={i}
      className={`reconnect-dot${i < connectedCount ? ' connected' : ''}`}
    />
  ));

  return (
    <div
      className={`reconnect-overlay${dismissing ? ' dismissing' : ''}`}
      role="alertdialog"
      aria-live="polite"
      aria-labelledby="reconnect-title"
    >
      <div className="reconnect-card">
        <span className="reconnect-seal" aria-hidden="true">
          <RotateCcw size={38} strokeWidth={1.5} />
        </span>

        <div className="reconnect-card__text">
          <p className="reconnect-eyebrow">{tr('reconnect.restoredOverline', 'Case reopened')}</p>
          <h2 className="reconnect-title" id="reconnect-title">{t('reconnect.title')}</h2>
          <p className="reconnect-phase">{phase}</p>

          <div className="reconnect-players">
            <div className="reconnect-player-dots">{dots}</div>
            <span className="reconnect-count">
              {t('reconnect.playersReconnected', { connected: String(connectedCount), total: String(totalPlayers) })}
            </span>
          </div>

          <div className="reconnect-action">
            {isHost ? (
              <button type="button" className="ps-btn ps-btn--primary reconnect-resume-btn" onClick={handleResume}>
                {t('reconnect.resumeGame')}
              </button>
            ) : (
              <>
                <div className="reconnect-waiting">
                  <div className="reconnect-waiting-spinner" aria-hidden="true" />
                  <span>{t('reconnect.waitingForHost')}</span>
                </div>
                {waitedTooLong && (
                  <button
                    type="button"
                    className="ps-btn ps-btn--ghost reconnect-reload-btn"
                    onClick={() => window.location.reload()}
                  >
                    <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
                    {t('reconnect.reloadPage')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconnectOverlay;
