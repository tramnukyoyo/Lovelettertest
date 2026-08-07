/**
 * Home Page — Prime Suspect
 *
 * Fleet-standard homepage (docs/FLEET_LOBBY_STANDARD.md, "Homepage-Standard"):
 * header · `.home-stage` grid (HERO left: mascot + wordmark + tagline + byline +
 * players/genre chip · CREATE CARD right: description + form, no card title, no
 * decor icons) · centred multiplayer-hint banner · legal footer IN the viewport.
 * Two columns only in landscape at container ≥820px; portrait stacks hero → card
 * in the same DOM order. The page never scrolls — overflow is absorbed by the
 * clamp() ladder at the bottom of styles/pages/home.css, never by a scrollbar.
 *
 * Prime Suspect signature: the case file opens under a desk lamp — a decorative
 * brass pendant (`.home-lamp`) casts the beam that lights the detective mascot
 * and the embossed wordmark, with dust motes (`.home-motes`) drifting through
 * it. All decor is aria-hidden, absolutely positioned (adds no layout height,
 * can never overlap text) and reduced-motion guarded.
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Users, Plus, Lightbulb, ExternalLink, ScanLine } from 'lucide-react';
import { GAME_META } from '../config/gameMeta';
import { HomeHeader, FloatingLabelInput, JoinFromInviteModal } from '../components/core';
import LegalFooter from '../components/core/LegalFooter';
import JoinScannedRoomModal from '../components/join/JoinScannedRoomModal';
import { getCurrentSession } from '../services/gameBuddiesSession';
import { isDiscordActivity } from '../services/discordActivity';
import { useAuthState } from '../services/supabaseAuth';
import { trackEvent } from '../services/analyticsService';
import { t } from '../utils/translations';

// Camera scanner is code-split — only fetched when the user taps "Scan QR".
const QrScannerOverlay = lazy(() => import('../components/join/QrScannerOverlay'));

// In-app webviews (Discord Activity especially) often deny camera access —
// hide the scan affordance where it can't work.
const canOfferQrScan =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  // Touch devices only - desktop webcam scanning is poor UX (user call 2026-07-07).
  (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) &&
  !isDiscordActivity();

interface HomePageProps {
  onCreateRoom: (playerName: string, streamerMode?: boolean) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onJoinWithInvite?: (inviteToken: string, playerName: string) => void;
  isConnecting?: boolean;
  error?: string | null;
}

const HomePage: React.FC<HomePageProps> = ({
  onCreateRoom,
  onJoinRoom,
  onJoinWithInvite,
  isConnecting = false,
  error
}) => {
  const [playerName, setPlayerName] = useState('');
  const [joinMode, setJoinMode] = useState<{ roomCode: string } | null>(null);
  const [streamerMode, setStreamerMode] = useState(false);
  const [isFromGameBuddies, setIsFromGameBuddies] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingCamStream, setPendingCamStream] = useState<Promise<MediaStream> | null>(null);
  const [scannedRoomCode, setScannedRoomCode] = useState<string | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Entrance vocabulary (polish playbook #6): fade+rise, staggered, and fully
  // neutralised when the user asks for reduced motion.
  const reduceMotion = useReducedMotion();
  const stageVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
  };
  const itemVariants: Variants = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } },
      };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite') || urlParams.get('room') || urlParams.get('join');

    if (inviteCode) {
      if (inviteCode.length > 10) {
        setInviteToken(inviteCode);
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
      setJoinMode({ roomCode: inviteCode.toUpperCase() });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const session = getCurrentSession();
    if (session) {
      setIsFromGameBuddies(true);
      if (session.playerName) setPlayerName(session.playerName);
      if (session.isStreamerMode) setStreamerMode(true);
    }
  }, []);

  // Signed in via the shared platform session (in-game modal or main site):
  // prefill the name field once the profile arrives. Platform-launch session
  // names and anything the user already typed take precedence.
  const auth = useAuthState();
  useEffect(() => {
    if (auth.status !== 'authed' || !auth.user) return;
    const profileName = auth.user.display_name || auth.user.username;
    if (profileName) {
      setPlayerName((current) => (current.trim() ? current : String(profileName)));
    }
  }, [auth.status, auth.user]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onCreateRoom(playerName.trim(), streamerMode);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && joinMode?.roomCode) {
      onJoinRoom(joinMode.roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const handleInviteJoin = (name: string) => {
    if (inviteToken && onJoinWithInvite) {
      onJoinWithInvite(inviteToken, name);
    }
  };

  // The gesture-context stream must be stopped DETERMINISTICALLY whenever the
  // scanner goes away — a live orphaned rear-camera track collides with the
  // next scan's getUserMedia on iOS (WebKit kills one of the two tracks).
  // Double-stopping tracks the hook already stopped is a harmless no-op.
  const releasePendingCamStream = (p: Promise<MediaStream> | null) => {
    p?.then(s => s.getTracks().forEach(t => t.stop())).catch(() => { /* denied — nothing to stop */ });
  };

  // Scanner results only PRODUCE a code/token — the join itself runs through
  // an explicit modal (scan → type name → Join). The old silent form-prefill
  // looked like "nothing happened" on a phone.
  const handleScannedRoomCode = (roomCode: string) => {
    setShowScanner(false);
    releasePendingCamStream(pendingCamStream);
    setPendingCamStream(null);
    setInviteToken(null);
    setScannedRoomCode(roomCode);
    trackEvent('qr_join_prefilled', { via: 'scanner' });
  };

  const handleScannedInviteToken = (token: string) => {
    setShowScanner(false);
    releasePendingCamStream(pendingCamStream);
    setPendingCamStream(null);
    setJoinMode(null);
    setInviteToken(token);
    trackEvent('qr_join_prefilled', { via: 'scanner', payload: 'invite' });
  };

  return (
    <div className="home-page">
      <HomeHeader />

      {/* GameBuddies Integration Banner */}
      {isFromGameBuddies && (
        <div className="home-gb-banner">
          <ExternalLink className="w-4 h-4" />
          <span>{t('home.gameBuddiesBanner')}</span>
        </div>
      )}

      {/* ── Focal set-piece: the candlelit case file. HERO column (mascot under
             the desk lamp + embossed wordmark) and the CREATE CARD, stacked on
             phones, split side-by-side on wide landscape screens via the
             container query on `.home-stage` in home.css. ─────────────────── */}
      <div className="home-stage">
      <motion.div
        className="home-stage-grid"
        variants={stageVariants}
        initial="hidden"
        animate="show"
      >
        <div className="home-hero-col">
          {/* Hero */}
          <motion.div className="home-hero" variants={itemVariants}>
            {/* Signature: the brass desk lamp that casts the hero beam — a
                visible warm source instead of an unexplained glow. Decorative,
                behind the content; only revealed where there is vertical room. */}
            <div className="home-lamp" aria-hidden="true" />
            {/* Dust motes drifting through the beam (transform-only, composited,
                reduced-motion guarded). */}
            <div className="home-motes" aria-hidden="true" />
            <img
              src={`${import.meta.env.BASE_URL}mascot.webp`}
              alt={GAME_META.mascotAlt}
              className="home-mascot"
            />
            <h1 className="home-title">
              {GAME_META.namePrefix}
              <span className="home-title-accent">{GAME_META.nameAccent}</span>
            </h1>
            <p className="home-tagline">{GAME_META.tagline}</p>
            <p className="home-gb-branding">
              <span className="home-gb-by">by </span>
              <span className="home-gb-game">Game</span>
              <span className="home-gb-buddies">Buddies</span>
              <span className="home-gb-io">.io</span>
            </p>
          </motion.div>

          {/* Multiplayer Badge */}
          <motion.div className="home-mp-badge" variants={itemVariants}>
            <Users className="w-4 h-4" />
            <span className="home-mp-badge-count">
              {t('home.multiplayerBadge', { min: GAME_META.minPlayers, max: GAME_META.maxPlayers })}
            </span>
            <span className="home-mp-badge-sep" aria-hidden="true">|</span>
            <span className="home-mp-badge-category">{GAME_META.category || 'Party Game'}</span>
          </motion.div>
        </div>

        {/* Card column. The Prime Suspect noir layer paints the parchment
            case-file skin directly on `.card.home-card`; the card's geometry
            (400x346 fleet box) is owned entirely by pages/home.css. */}
        <div className="home-card-col">
          {/* Error Message */}
          {error && (
            <div className="home-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          {/* Single Adaptive Card — description + form only (fleet standard:
              no card title, no decor icons). */}
          <motion.div
            className="card home-card"
            variants={itemVariants}
            ref={cardsRef}
            aria-label={joinMode ? t('home.joinRoom') : t('home.createRoom')}
          >
            <p className="card-description">
              {joinMode ? t('home.joinDescription') : t('home.createDescription')}
            </p>
            <form onSubmit={joinMode ? handleJoin : handleCreate} className="home-form">
              <FloatingLabelInput
                label={t('home.yourName')}
                value={playerName}
                onChange={setPlayerName}
                maxLength={20}
                required
              />
              {!joinMode && (
                <label className="home-checkbox-label">
                  <input
                    type="checkbox"
                    checked={streamerMode}
                    onChange={(e) => setStreamerMode(e.target.checked)}
                    className="home-checkbox"
                  />
                  <span className="home-checkbox-text">{t('home.streamerMode')}</span>
                </label>
              )}
              <button
                type="submit"
                disabled={isConnecting || !playerName.trim()}
                className={`home-btn ${joinMode ? 'secondary' : 'primary'}`}
              >
                <span className="home-btn-inner">
                  {!isConnecting && (
                    joinMode
                      ? <Users className="w-4 h-4" />
                      : <Plus className="w-4 h-4" />
                  )}
                  <span>
                    {isConnecting
                      ? t('common.loading')
                      : joinMode
                        ? t('home.joinRoom')
                        : t('home.createRoom')}
                  </span>
                </span>
              </button>
              {/* The CTA's resting (disabled) state is a designed "sealed
                  dossier", not a greyed-out button — this hairline note is what
                  makes that state EXPLAIN itself instead of reading as broken.
                  Shown only while the CTA is genuinely un-armed. */}
              {!isConnecting && !playerName.trim() && (
                <p className="home-form-note">{t('home.formNote')}</p>
              )}
              {canOfferQrScan && (
                <button
                  type="button"
                  className="home-scan-qr-btn"
                  onClick={() => {
                    // iOS standalone PWAs only grant the camera INSIDE the
                    // tap's call stack — request it here and hand the pending
                    // stream to the scanner (an effect-time request works in
                    // Safari but is rejected in Home Screen installs).
                    const pending = navigator.mediaDevices?.getUserMedia
                      ? navigator.mediaDevices.getUserMedia({
                          video: { facingMode: { ideal: 'environment' } },
                          audio: false,
                        }).catch(() =>
                          // Some iOS standalone builds reject constrained
                          // requests but accept a bare one (still inside the
                          // gesture's transient activation window).
                          navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                        )
                      : null;
                    pending?.catch(() => { /* hook re-awaits and surfaces it */ });
                    setPendingCamStream(pending);
                    setShowScanner(true);
                    trackEvent('qr_scan_opened', {});
                  }}
                >
                  <ScanLine className="w-4 h-4" />
                  {t('scanQr.button')}
                </button>
              )}
            </form>
          </motion.div>
        </div>

        {/* Tip Banner — a hairline strip spanning both columns, closing the
            composition instead of stranding under the card. */}
        <motion.div className="home-tip-banner" variants={itemVariants}>
          <Lightbulb className="w-4 h-4" />
          <span>{t('home.multiplayerTip')}</span>
        </motion.div>
      </motion.div>
      </div>

      {/* Legal footer (Impressum / Datenschutz / Terms). Homepage only — the
          lobby/in-game views reach the same links via the Settings ⚙ menu. */}
      <LegalFooter />

      {/* Invite Modal */}
      {inviteToken && (
        <JoinFromInviteModal
          inviteToken={inviteToken}
          onClose={() => setInviteToken(null)}
          onJoin={handleInviteJoin}
          isConnecting={isConnecting}
          error={error}
        />
      )}

      {/* Post-scan join modal: scan → name → join */}
      {scannedRoomCode && (
        <JoinScannedRoomModal
          roomCode={scannedRoomCode}
          onClose={() => setScannedRoomCode(null)}
          onJoin={(name) => onJoinRoom(scannedRoomCode, name)}
          isConnecting={isConnecting}
          error={error}
          initialName={playerName}
        />
      )}

      {/* QR scanner overlay (scan the TV's big-screen QR to join) */}
      {showScanner && (
        <Suspense fallback={null}>
          <QrScannerOverlay
            onRoomCode={handleScannedRoomCode}
            onInviteToken={handleScannedInviteToken}
            onClose={() => {
              setShowScanner(false);
              releasePendingCamStream(pendingCamStream);
              setPendingCamStream(null);
            }}
            pendingStream={pendingCamStream}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;
