/**
 * FreezeOverlay — "INVESTIGATION INTERRUPTED": the case file goes on hold while
 * the socket is DEAD.
 *
 * This is the other half of the outage story from ReconnectOverlay:
 *   FreezeOverlay  - connection is gone. Nothing can be sent, nothing is
 *                    ticking, there is nothing the player can do but wait.
 *   ReconnectOverlay - connection is back, the server restored the room and
 *                    is waiting for the host to resume.
 *
 * It renders ON TOP of the still-mounted game tree — never in place of it — so
 * in-progress local state (a selected card, a half-made accusation) is exactly
 * where the player left it when the socket comes back. The scrim is deliberately
 * translucent: the candlelit table stays readable behind the card, because the
 * whole promise of this screen is "your case is still here".
 *
 * Progress is MEASURED, not mimed: the attempt number comes off the socket.io
 * Manager's own `reconnect_attempt` event and the clock is real elapsed time.
 * The bar shows how far into the current backoff window we are and restarts on
 * every attempt.
 *
 * variant="lobby" renders the same language as a slim, non-blocking top banner
 * so a lobby stays browsable while clearly marked offline (App.tsx currently
 * only mounts the full curtain for state !== 'LOBBY').
 */

import React, { useEffect, useState } from 'react';
import { Pause, RotateCcw } from 'lucide-react';
import { t } from '../../utils/translations';
import socketService from '../../services/socketService';
import './FreezeOverlay.css';

/** t() returns the key itself on a miss, so `t(k) || fallback` NEVER fires.
 *  This renders the intended English until the key lands in all six locales. */
function tr(key: string, fallback: string, params?: Record<string, string | number>): string {
  const value = t(key, params);
  if (value !== key) return value;
  if (!params) return fallback;
  return fallback.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

/** How long a player stares at a dead line before we offer the manual escape. */
const MANUAL_ESCAPE_AFTER_MS = 20000;

/** socket.io's own backoff: reconnectionDelay 1000 → reconnectionDelayMax 5000. */
const BACKOFF_MIN_MS = 1000;
const BACKOFF_MAX_MS = 5000;

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

interface FreezeOverlayProps {
  /** 'full' = blocking curtain over a live game. 'lobby' = slim top banner. */
  variant?: 'full' | 'lobby';
}

const FreezeOverlay: React.FC<FreezeOverlayProps> = ({ variant = 'full' }) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [windowMs, setWindowMs] = useState(BACKOFF_MAX_MS);
  const [cycle, setCycle] = useState(0);
  const [showEscape, setShowEscape] = useState(false);

  // The curtain swallows pointer input by itself, but keyboard events go to
  // window/document listeners (chat, shortcuts) that never see the DOM overlay.
  // Capture keydown at the window and stop it there.
  // keyup is deliberately NOT blocked: a key held down when the freeze started
  // is already in the game's "pressed" map, and swallowing its release would
  // leave it stuck down once the game resumes.
  // The lobby banner is non-blocking, so it does not swallow anything.
  useEffect(() => {
    if (variant !== 'full') return;
    const swallow = (e: KeyboardEvent) => e.stopPropagation();
    window.addEventListener('keydown', swallow, true);
    return () => window.removeEventListener('keydown', swallow, true);
  }, [variant]);

  // Real elapsed time offline.
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - started), 1000);
    const escapeTimer = setTimeout(() => setShowEscape(true), MANUAL_ESCAPE_AFTER_MS);
    return () => {
      clearInterval(id);
      clearTimeout(escapeTimer);
    };
  }, []);

  // Real reconnect attempts, straight off the socket.io Manager.
  useEffect(() => {
    const manager = socketService.getSocket()?.io;
    if (!manager) return;
    const onAttempt = (n: number) => {
      setAttempt(n);
      setWindowMs(Math.min(BACKOFF_MIN_MS * Math.pow(2, Math.max(0, n - 1)), BACKOFF_MAX_MS));
      // Restarts the determinate bar: a new key remounts the fill element.
      setCycle((c) => c + 1);
    };
    manager.on('reconnect_attempt', onAttempt);
    return () => {
      manager.off('reconnect_attempt', onAttempt);
    };
  }, []);

  const isBanner = variant === 'lobby';

  return (
    <div
      className={`freeze-overlay${isBanner ? ' freeze-overlay--banner' : ''}`}
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      aria-labelledby="freeze-title"
      onContextMenu={(e) => {
        if (!isBanner) e.preventDefault();
      }}
    >
      <div className="freeze-card">
        <span className="freeze-seal" aria-hidden="true">
          <Pause size={isBanner ? 20 : 30} strokeWidth={1.5} />
        </span>

        <div className="freeze-card__text">
          <p className="freeze-eyebrow">{tr('reconnect.frozenOverline', 'Case on hold')}</p>
          <h2 className="freeze-title" id="freeze-title">{t('reconnect.frozenTitle')}</h2>
          <p className="freeze-body">{t('reconnect.frozenBody')}</p>

          <div className="freeze-progress" aria-hidden="true">
            <span
              key={cycle}
              className="freeze-progress__fill"
              style={{ animationDuration: `${windowMs}ms` }}
            />
          </div>

          {/* The bar above is the retry pulse, not a loading bar — so the label
              is constant and the attempt number trails it as a count. Swapping
              the whole label to "Attempt 1" (as it used to) made a restarting
              backoff window look like progress toward something. */}
          <p className="freeze-status">
            <span className="freeze-status__attempt">
              {tr('reconnect.retrying', 'Retrying the line')}
              {attempt > 0 && <span className="freeze-status__count"> · {attempt}</span>}
            </span>
            <span className="freeze-status__time">{formatElapsed(elapsedMs)}</span>
          </p>

          {showEscape && (
            <button
              type="button"
              className="ps-btn ps-btn--ghost freeze-escape"
              onClick={() => window.location.reload()}
            >
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('reconnect.reloadPage')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreezeOverlay;
