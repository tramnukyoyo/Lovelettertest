/**
 * PostGameGuestNudge — fleet-standard guest signup nudge on the results screen
 * (2026-08-11, Growth-Report Hebel A3 extended into the games).
 *
 * Guests see their +XP/+GP in PostGameRewards but nothing tells them those
 * numbers evaporate without an account. This renders one quiet line + CTA
 * right after the rewards, opening the existing in-room GameAuthModal
 * (shared platform Supabase session — no redirect, room stays alive).
 *
 * Shown once per browser session (sessionStorage cap) so serial rematchers
 * aren't nagged every round. English on purpose — same convention as
 * PostGameShareCta, keeps the fleet copy-wave to two files.
 */

import React, { useEffect, useRef, useState } from 'react';
import GameAuthModal from '../core/GameAuthModal';
import { trackEvent } from '../../services/analyticsService';

const SEEN_KEY = 'gb_postgame_guest_nudge_seen';

interface PostGameGuestNudgeProps {
  isGuest: boolean;
  roomCode: string | null | undefined;
  playerName?: string;
}

const PostGameGuestNudge: React.FC<PostGameGuestNudgeProps> = ({ isGuest, roomCode, playerName }) => {
  const [authOpen, setAuthOpen] = useState(false);
  // Session cap decided once at mount — the overlay re-renders per phase tick
  // and reading storage in render would hide the nudge mid-animation.
  const [capped] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  });

  const trackedRef = useRef(false);
  useEffect(() => {
    if (!isGuest || capped || trackedRef.current) return;
    trackedRef.current = true;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* best effort */ }
    trackEvent('guest_reg_prompt_viewed', { trigger: 'game_postgame', room_code: roomCode ?? '' });
  }, [isGuest, capped, roomCode]);

  if (!isGuest || capped) return null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginTop: 6,
          fontFamily: "ui-rounded, 'Segoe UI', system-ui, -apple-system, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(20,20,32,0.75)',
        }}
      >
        <span>Playing as guest — your XP &amp; GP vanish when you leave.</span>
        <button
          type="button"
          onClick={() => {
            trackEvent('guest_reg_prompt_clicked', { trigger: 'game_postgame', room_code: roomCode ?? '' });
            setAuthOpen(true);
          }}
          style={{
            border: '2px solid #0a0a14',
            borderRadius: 8,
            padding: '4px 12px',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            background: '#ffd23f',
            color: '#0a0a14',
            boxShadow: '2px 2px 0 rgba(10,10,20,0.55)',
          }}
        >
          Keep my progress
        </button>
      </div>
      {authOpen && (
        <GameAuthModal
          onClose={() => setAuthOpen(false)}
          roomCode={roomCode ?? undefined}
          playerName={playerName}
        />
      )}
    </>
  );
};

export default PostGameGuestNudge;
