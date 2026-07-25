/**
 * FreezeOverlay - hard pause while the socket is DEAD mid-game.
 *
 * This is the other half of the outage story from ReconnectOverlay:
 *   FreezeOverlay  - connection is gone. Nothing can be sent, nothing is
 *                    ticking, there is nothing the player can do but wait.
 *   ReconnectOverlay - connection is back, the server restored the room and
 *                    is waiting for the host to resume.
 *
 * Deliberately has no button: any action would need the socket that just
 * died. It renders ON TOP of the still-mounted game tree — never in place of
 * it — so in-progress local state (a typed lie, a half-finished drawing, a
 * selection) is exactly where the player left it when the socket comes back.
 */

import React, { useEffect } from 'react';
import { t } from '../../utils/translations';
import './FreezeOverlay.css';

const FreezeOverlay: React.FC = () => {
  // The curtain swallows pointer input by itself, but keyboard events go to
  // window/document listeners (Phaser, r3f, chat) that never see the DOM
  // overlay. Capture keydown at the window and stop it there.
  // keyup is deliberately NOT blocked: a key held down when the freeze started
  // is already in the game's "pressed" map, and swallowing its release would
  // leave it stuck down once the game resumes.
  useEffect(() => {
    const swallow = (e: KeyboardEvent) => e.stopPropagation();
    window.addEventListener('keydown', swallow, true);
    return () => window.removeEventListener('keydown', swallow, true);
  }, []);

  return (
    <div
      className="freeze-overlay"
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="freeze-card">
        <div className="freeze-icon">⏸</div>
        <div className="freeze-title">{t('reconnect.frozenTitle')}</div>
        <div className="freeze-body">{t('reconnect.frozenBody')}</div>
        <div className="freeze-dots">
          <div className="freeze-dot" />
          <div className="freeze-dot" />
          <div className="freeze-dot" />
        </div>
      </div>
    </div>
  );
};

export default FreezeOverlay;
