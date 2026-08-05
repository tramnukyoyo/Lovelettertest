/**
 * PostGameShareCta — fleet-standard postgame share button (2026-08-05).
 *
 * Builds the room's `?join=CODE&postgame=1` link (which unfurls as a
 * winner/result card via the platform's /api/og/result endpoint), shares via
 * navigator.share with a clipboard fallback, and reports `invite_shared`
 * (surface: game_postgame) so the share rate is measurable against the
 * platform's existing invite funnel.
 *
 * Fleet copy rules: self-contained; adapt ONLY the SKIN block and the
 * gameName the parent passes in. Place it on the results screen near the
 * rematch controls.
 */
import React, { useCallback, useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { trackEvent } from '../../services/analyticsService';

// ---- SKIN (per-client visual language; Prime Suspect = royal noir velvet) --
const SKIN = {
  background: '#6a1623',
  color: '#e7cc7a',
  border: '1px solid rgba(210, 178, 90, 0.55)',
  borderRadius: 6,
  boxShadow: '0 4px 0 #3d0c13',
  fontFamily: "'Cinzel', 'Georgia', serif",
};
// ---------------------------------------------------------------------------

const SHARE_ORIGIN = 'https://gamebuddies.io';

interface PostGameShareCtaProps {
  roomCode: string | null | undefined;
  gameName: string;
}

const PostGameShareCta: React.FC<PostGameShareCtaProps> = ({ roomCode, gameName }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!roomCode) return;
    const url = `${SHARE_ORIGIN}/?join=${encodeURIComponent(roomCode)}&postgame=1`;
    const text = `I just played ${gameName} on GameBuddies.io — think you can beat us?`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'GameBuddies.io', text, url });
        trackEvent('invite_shared', {
          surface: 'game_postgame', method: 'native_share', content: 'results',
          game_name: gameName, has_invite_link: true,
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        trackEvent('invite_shared', {
          surface: 'game_postgame', method: 'clipboard', content: 'results',
          game_name: gameName, has_invite_link: true,
        });
      }
    } catch {
      // Share sheet dismissed / clipboard blocked — not an error, not tracked.
    }
  }, [roomCode, gameName]);

  if (!roomCode) return null;

  return (
    <button
      type="button"
      onClick={handleShare}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: 0.4,
        cursor: 'pointer',
        background: SKIN.background,
        color: SKIN.color,
        border: SKIN.border,
        borderRadius: SKIN.borderRadius,
        boxShadow: SKIN.boxShadow,
        fontFamily: SKIN.fontFamily,
      }}
    >
      {copied ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : <Share2 size={15} strokeWidth={2.5} aria-hidden="true" />}
      {copied ? 'Link copied!' : 'Challenge friends'}
    </button>
  );
};

export default PostGameShareCta;
