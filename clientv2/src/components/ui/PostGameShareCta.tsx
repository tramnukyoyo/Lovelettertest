/**
 * PostGameShareCta — fleet-standard postgame share button (2026-08-05).
 *
 * Preloads the immutable result URL from the platform resolver, shares via
 * navigator.share with a clipboard fallback, and reports `invite_shared`
 * (surface: game_postgame) so the share rate is measurable against the
 * platform's existing invite funnel.
 *
 * Fleet copy rules: self-contained; adapt ONLY the SKIN block and the
 * gameName the parent passes in. Place it on the results screen near the
 * rematch controls.
 */
import React, { useCallback, useEffect, useState } from 'react';
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

const GAME_TYPES: Record<string, string> = {
  badactor: 'badactor',
  bingobuddies: 'bingo',
  bingo: 'bingo',
  blindspot: 'blindspot',
  bluffalo: 'bluffalo',
  canvaschaos: 'canvas-chaos',
  cluescale: 'cluescale',
  decoded: 'decoded',
  hotpotato: 'hotpotato',
  lastbrainstanding: 'lastbrainstanding',
  letterrush: 'letter-rush',
  primesuspect: 'primesuspect',
  schooled: 'schooled',
  soundbite: 'soundbite',
  thinkalike: 'thinkalike',
  tierbattle: 'tierbattle',
  zoomies: 'zoomies',
};
const toGameType = (name: string) => {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return GAME_TYPES[key] || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
};


interface PostGameShareCtaProps {
  roomCode: string | null | undefined;
  gameName: string;
}

const PostGameShareCta: React.FC<PostGameShareCtaProps> = ({ roomCode, gameName }) => {
  const [copied, setCopied] = useState(false);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    const controller = new AbortController();
    const gameType = toGameType(gameName);
    const resolve = async () => {
      for (let attempt = 0; attempt < 8 && !controller.signal.aborted; attempt += 1) {
        try {
          const response = await fetch(
            `${SHARE_ORIGIN}/api/share/resolve/latest?roomCode=${encodeURIComponent(roomCode)}&gameType=${encodeURIComponent(gameType)}`,
            { signal: controller.signal },
          );
          if (response.ok) {
            const body = await response.json();
            if (body?.success && body.shareUrl) {
              setShareUrl(new URL(body.shareUrl, SHARE_ORIGIN).toString());
              setIsPreparing(false);
              return;
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
        if (attempt < 7) await new Promise(resolveDelay => window.setTimeout(resolveDelay, 750));
      }
      if (!controller.signal.aborted) setIsPreparing(false);
    };
    void resolve();
    return () => controller.abort();
  }, [roomCode, gameName]);


  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    const url = shareUrl;
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
  }, [shareUrl, gameName]);

  if (!roomCode) return null;

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={!shareUrl}
      aria-busy={isPreparing}
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
      {copied ? 'Link copied!' : isPreparing ? 'Preparing result…' : shareUrl ? 'Share result' : 'Result unavailable'}
    </button>
  );
};

export default PostGameShareCta;
