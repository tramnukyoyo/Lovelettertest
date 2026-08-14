/**
 * Solo Invite Panel
 *
 * Shown in the lobby when the player is alone (< 2 connected players).
 * Provides prominent sharing tools: room code tiles, copy link, native share.
 * Collapses when a 2nd player joins.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Copy, Check, Share2, QrCode, UserPlus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { t } from '../../utils/translations';
import socketService from '../../services/socketService';

interface SoloInvitePanelProps {
  roomCode: string;
  gameName: string;
  minPlayers: number;
  currentPlayers: number;
  hideRoomCode?: boolean;
  /**
   * Extra action that belongs in the SAME wrapping row as copy / share / QR
   * (the lobby passes its card-back designer entry here). Rendered as a
   * sibling button so the invite band degrades 3 → 2 → 1 per line instead of
   * ejecting the last action out of the pane at 768/1366.
   */
  actionSlot?: React.ReactNode;
}

interface InviteFriend {
  id: string;
  username: string;
  displayName: string | null;
  online: boolean;
}

/**
 * Friends section of the invite panel. Fetches the player's GameBuddies
 * friends (with online presence) via the cross-game `gb:friends:list` ack
 * event and lets them one-click invite via `gb:invite:send` — the friend gets
 * a platform toast/notification with a join link. Renders nothing for guests
 * or when the platform is unreachable (server answers with an empty list).
 */
const InviteFriends: React.FC = () => {
  const [friends, setFriends] = useState<InviteFriend[]>([]);
  const [inviteState, setInviteState] = useState<Record<string, 'sent' | 'failed'>>({});

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    let cancelled = false;
    socket.emit('gb:friends:list', {}, (resp: { friends?: InviteFriend[] }) => {
      if (!cancelled && Array.isArray(resp?.friends)) {
        // Only friends who can receive the invite right now (online on the
        // platform or in a game) — offline friends are noise in this panel.
        const online = resp.friends
          .filter((f) => f.online)
          .sort((a, b) => a.username.localeCompare(b.username));
        setFriends(online);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleInvite = useCallback((friendId: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('gb:invite:send', { toUserId: friendId }, (resp: { success?: boolean }) => {
      setInviteState(prev => ({ ...prev, [friendId]: resp?.success ? 'sent' : 'failed' }));
    });
  }, []);

  if (friends.length === 0) return null;

  return (
    <div className="invite-friends">
      <h4 className="invite-friends-title">
        <UserPlus className="w-4 h-4" />
        {t('invitePanel.friendsTitle')}
      </h4>
      <ul className="invite-friends-list">
        {friends.slice(0, 8).map((f) => (
          <li key={f.id} className="invite-friends-item">
            <span className={`invite-friend-dot ${f.online ? 'online' : 'offline'}`} />
            <span className="invite-friend-name">{f.displayName || f.username}</span>
            <button
              type="button"
              className="invite-friend-btn"
              disabled={inviteState[f.id] === 'sent'}
              onClick={() => handleInvite(f.id)}
            >
              {inviteState[f.id] === 'sent'
                ? t('invitePanel.sent')
                : inviteState[f.id] === 'failed'
                  ? t('invitePanel.failed')
                  : t('invitePanel.invite')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const SoloInvitePanel: React.FC<SoloInvitePanelProps> = ({
  roomCode,
  gameName,
  minPlayers,
  currentPlayers,
  hideRoomCode = false,
  actionSlot,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const pendingActionRef = useRef<'copy' | 'share' | null>(null);

  // Direct room-code URL (non-streamer). Safe to compute synchronously.
  // gbRegion: room→region pin — invitees (copy/share/QR) must land on THIS
  // room's regional server, not their own latency race (split-brain guard).
  const directRoomUrl = `${window.location.origin}${import.meta.env.BASE_URL}?room=${roomCode}&gbRegion=${socketService.getCurrentRegion()}`;
  // utm per share surface: same-origin localStorage capture (utils/utmCapture)
  // feeds the platform's first-touch signup attribution (kpi_user_first_seen).
  // Streamer token links stay untagged by design (mirrors the platform).
  const withUtm = (medium: 'game_copy' | 'game_share' | 'game_qr'): string =>
    `${directRoomUrl}&utm_source=invite&utm_medium=${medium}`;

  // Streamer mode: ask server for a real invite-token UUID, then copy/share the ?invite=<uuid> URL
  useEffect(() => {
    if (!hideRoomCode) return;
    const socket = socketService.getSocket();
    if (!socket) return;
    const onInviteCreated = (data: { inviteToken: string }) => {
      // gbRegion: room→region pin (see directRoomUrl above).
      const url = `${window.location.origin}${import.meta.env.BASE_URL}?invite=${data.inviteToken}&gbRegion=${socketService.getCurrentRegion()}`;
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (action === 'share' && navigator.share) {
        navigator.share({
          title: gameName,
          text: t('home.whatsappText', { game: gameName, url }),
          url,
        }).catch(() => { /* user cancelled */ });
      } else {
        navigator.clipboard.writeText(url).then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
        }).catch((err) => console.error('Failed to copy:', err));
      }
    };
    socket.on('room:invite-created', onInviteCreated);
    return () => { socket.off('room:invite-created', onInviteCreated); };
  }, [hideRoomCode, gameName]);

  const handleCopyLink = useCallback(async () => {
    if (hideRoomCode) {
      const socket = socketService.getSocket();
      if (!socket) return;
      pendingActionRef.current = 'copy';
      socket.emit('room:create-invite');
      return;
    }
    try {
      await navigator.clipboard.writeText(withUtm('game_copy'));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [directRoomUrl, hideRoomCode]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    if (hideRoomCode) {
      const socket = socketService.getSocket();
      if (!socket) return;
      pendingActionRef.current = 'share';
      socket.emit('room:create-invite');
      return;
    }
    try {
      const url = withUtm('game_share');
      await navigator.share({
        title: gameName,
        text: t('home.whatsappText', { game: gameName, url }),
        url,
      });
    } catch {
      // User cancelled or share failed silently
    }
  }, [gameName, withUtm, hideRoomCode]);

  const playersNeeded = Math.max(0, minPlayers - currentPlayers);

  return (
    <div className="solo-invite-panel">
      <h3 className="solo-invite-title">{t('lobby.inviteTitle')}</h3>

      {/* Room Code Tiles — hidden in streamer mode */}
      {!hideRoomCode ? (
        <div className="solo-invite-code-tiles">
          {roomCode.split('').map((char, i) => (
            <span key={i} className="solo-invite-tile">{char}</span>
          ))}
        </div>
      ) : (
        <div className="solo-invite-streamer-badge">
          <span>{t('header.streamerMode')}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="solo-invite-actions">
        <button onClick={handleCopyLink} className="solo-invite-btn solo-invite-btn-copy">
          {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{linkCopied ? t('home.linkCopied') : t('lobby.copyInviteLink')}</span>
        </button>

        {typeof navigator.share === 'function' && (
          <button onClick={handleNativeShare} className="solo-invite-btn solo-invite-btn-share">
            <Share2 className="w-4 h-4" />
            <span>{t('home.share')}</span>
          </button>
        )}

        {/* QR join — direct room URL only (streamer mode hides the code) */}
        {!hideRoomCode && (
          <button onClick={() => setShowQr(v => !v)} className="solo-invite-btn solo-invite-btn-qr" type="button">
            <QrCode className="w-4 h-4" />
            <span>{t('invitePanel.qr')}</span>
          </button>
        )}

        {actionSlot}
      </div>

      {showQr && !hideRoomCode && (
        /* Tap anywhere to dismiss — on landscape phones this renders as a
           fixed overlay (shell.css) and used to be an unclosable bare QR. */
        <div
          className="solo-invite-qr"
          onClick={() => setShowQr(false)}
          role="button"
          aria-label={t('common.close')}
        >
          <div className="solo-invite-qr-card">
            <QRCodeSVG value={withUtm('game_qr')} size={132} bgColor="#ffffff" fgColor="#05020e" includeMargin />
            <span className="solo-invite-qr-caption">{roomCode}</span>
            <span className="solo-invite-qr-hint">{t('invitePanel.qrCloseHint')}</span>
          </div>
        </div>
      )}

      {/* GameBuddies friends — one-click platform invites */}
      <InviteFriends />

      {/* Players needed hint */}
      {playersNeeded > 0 && (
        <p className="solo-invite-hint">
          {t('lobby.needMorePlayers', { count: playersNeeded })}
        </p>
      )}

      <p className="solo-invite-subtext">{t('lobby.shareToInvite')}</p>
    </div>
  );
};

export default SoloInvitePanel;
