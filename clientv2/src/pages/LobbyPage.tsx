/**
 * Lobby Page — Prime Suspect
 *
 * FLEET-STANDARD LOBBY (docs/FLEET_LOBBY_STANDARD.md, Bad-Actor anatomy):
 *   SceneHeader   title + ?-help, centered — nothing else
 *   SceneBody     .gs-lobby-panes.gs-lobby-cols
 *                   [DOM 1 · desktop RIGHT] CREW  — seat cards + ghost seats
 *                                                   + invite band
 *                   [DOM 2 · desktop LEFT ] BRIEF — host settings / guest
 *                                                   read-only case briefing
 *   SceneActions  START, host-only, min(100%, 620px) under the crew column
 *
 * The crew pane stays DOM-FIRST so phones get the invite-first flow; the
 * desktop order comes from explicit grid placement in styles/pages/lobby.css.
 * The bespoke detective card table (HeartsGambitGame) owns PLAYING / ENDED —
 * LobbyPage owns LOBBY.
 *
 * Shell wiring (header / rail / drawer / video / dock) mirrors GamePage so the
 * shell stays consistent across phases.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Play, Crown } from 'lucide-react';
import type { Lobby, ChatMessage, Player } from '../types';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import type { WebcamPlayer } from '../config/WebcamConfig';
import socketService from '../services/socketService';
import { getTranslation, getCurrentLanguage } from '../utils/gameTranslations';
import { t as tShell } from '../utils/translations';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { GameHeader, SidebarTabs, FlairName } from '../components/core';
import type { SidebarTab } from '../components/core';
import { Avatar } from '../components/core/Avatar';
import { usePlayerProfile } from '../services/playerProfiles';
import { cosmeticClass } from '../utils/cosmetics';
import { frameThemeClass } from '../utils/frameThemes';
import { useFrameTryOn } from '../services/frameTryOn';
import { ChatWindow, PlayerList, SoloInvitePanel } from '../components/lobby';
import { GameExplainer, GameExplainerHelpButton } from '../components/lobby/GameExplainer';
import { primeSuspectDemoSpec } from '../components/lobby/GameExplainer/demos/PrimeSuspectDemo';
import '../components/lobby/GameExplainer/GameExplainer.css';
import HostSettings from '../components/lobby/HostSettings';
import GuestBriefingPanel from '../components/lobby/GuestBriefingPanel';
import CollapsibleSection from '../components/core/CollapsibleSection';
import { GAME_META } from '../config/gameMeta';
import { MobileDrawer } from '../components/mobile';
import type { DrawerContent } from '../components/mobile';
import GameShell from '../shell/GameShell';
import PresenceDock from '../shell/PresenceDock';
import ScrollHint from '../shell/ScrollHint';
import type { DockPlayer } from '../shell/PresenceDock';
import { Scene, SceneHeader, SceneBody, SceneActions } from '../shell/Scene';
import { useIdleHint } from '../hooks/useIdleHint';
import '../styles/idleHint.css';

// GP card-back designer (ps_style) — lazy: opened on demand.
const CardBackDesigner = React.lazy(() => import('../components/lobby/CardBackDesigner'));

/**
 * Card-back glyph for the designer entry — an inline SVG in the noir line
 * style. Replaces the system playing-card-back emoji (U+1F0A0), the one
 * full-colour platform glyph in an otherwise gold-on-velvet lobby.
 */
const CardBackIcon: React.FC = () => (
  <svg
    className="ps-designer-btn__icon"
    viewBox="0 0 20 20"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="6.2" y="2.6" width="11" height="14.8" rx="1.6" />
    <path d="M4.2 4.9 A1.6 1.6 0 0 0 2.8 6.5 v9.3 A1.6 1.6 0 0 0 4.4 17.4 h7.4" opacity="0.55" />
    <path d="M11.7 6.2 13.9 10 11.7 13.8 9.5 10 Z" />
  </svg>
);

/**
 * The seat's avatar tile. The frame ring rides on `.gs-crew__av` ITSELF —
 * the tile is `overflow: hidden`, so an inner wrapper would clip the ring
 * (fleet standard rule 9).
 */
const CrewAvatar: React.FC<{ p: Player; frameOverride?: string | null }> = ({ p, frameOverride }) => {
  const profile = usePlayerProfile(p.id);
  const frameClass = cosmeticClass(frameOverride !== undefined ? frameOverride : profile?.cosmetics.frameId);
  return (
    <span className={`gs-crew__av ${frameClass ? `avatar-frame-wrap ${frameClass}` : ''}`.trim()}>
      <Avatar src={p.avatarUrl} alt="" />
    </span>
  );
};

/**
 * Big crew card — the suspects board's seat. Platform-cosmetics aware: the
 * equipped frame's accent owns the card border (`fr-theme-*` token class), and
 * the OWN seat mirrors the roster picker's live try-on so a preview paints the
 * rail row, this card and the dock chip at once (owner rule 2026-07-31).
 * A subcomponent because the profile hook cannot be called inside a .map().
 */
const CrewCard: React.FC<{ p: Player; index: number; isMe: boolean }> = ({ p, index, isMe }) => {
  const profile = usePlayerProfile(p.id);
  const tryOn = useFrameTryOn();
  const frameId = isMe && tryOn !== undefined ? tryOn : profile?.cosmetics.frameId;
  return (
    <li
      className={[
        'gs-crew__card',
        isMe ? 'is-me' : '',
        p.isHost ? 'is-host' : '',
        p.connected ? '' : 'is-off',
        frameThemeClass(frameId),
      ].filter(Boolean).join(' ')}
      style={{ '--i': index } as React.CSSProperties}
    >
      <span className="gs-crew__slug">
        <span className="gs-crew__num">#{String(index + 1).padStart(2, '0')}</span>
        <span className={`gs-crew__dot${p.connected ? '' : ' is-off'}`} aria-hidden="true" />
      </span>
      <CrewAvatar p={p} frameOverride={isMe && tryOn !== undefined ? tryOn : undefined} />
      <span className="gs-crew__name-wrap" title={p.name}>
        <FlairName player={p} className="gs-crew__name" />
      </span>
      <span className={`gs-crew__tag${p.isHost ? ' is-host' : isMe ? ' is-me' : ''}`}>
        {p.isHost ? (
          <><Crown className="gs-crew__crown" aria-hidden="true" />{tShell('lobby.host')}</>
        ) : isMe ? tShell('lobby.you') : ' '}
      </span>
    </li>
  );
};

interface LobbyPageProps {
  lobby: Lobby;
  messages: ChatMessage[];
  gameBuddiesSession?: GameBuddiesSession | null;
  onLeave?: () => void;
}

const LobbyPage: React.FC<LobbyPageProps> = ({
  lobby,
  messages,
  gameBuddiesSession,
}) => {
  const socket = socketService.getSocket();
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  const [drawerContent, setDrawerContent] = useState<DrawerContent>(null);
  const hasAutoOpenedVideoRef = useRef(false);
  // "Your card back" GP designer modal (ps_style).
  const [showDesigner, setShowDesigner] = useState(false);

  // Player chat ONLY (system / game-log events belong in the Case Log, not chat).
  const chatMessages = messages.filter(m => m.playerId !== 'system' && !m.isSystem);

  // Sidebar tabs / unread state
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('players');
  const [unreadCount, setUnreadCount] = useState(0);
  const lastMessageCountRef = useRef(chatMessages.length);

  const { prepareVideoChat, isVideoChatActive, disableVideoChat } = useWebRTC();
  const isMobile = useIsMobile();

  // Track unread messages when chat tab is not active (chat-only, excludes log)
  useEffect(() => {
    if (activeSidebarTab === 'chat') {
      setUnreadCount(0);
      lastMessageCountRef.current = chatMessages.length;
    } else {
      const newMessages = chatMessages.length - lastMessageCountRef.current;
      if (newMessages > 0) {
        setUnreadCount(prev => prev + newMessages);
        lastMessageCountRef.current = chatMessages.length;
      }
    }
  }, [chatMessages.length, activeSidebarTab]);

  const myPlayer = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isHost = myPlayer?.isHost || false;
  const connectedPlayers = lobby.players.filter(p => p.connected);
  const minPlayers = lobby.settings?.minPlayers || GAME_META.minPlayers;
  const canStart = isHost && connectedPlayers.length >= minPlayers;
  // Enough players are in and everyone is waiting on the host to press
  // Start. canStart already means "host AND enough players", so this only
  // ever fires for the one person who can actually act.
  const startHint = useIdleHint(canStart, 12000);

  // Crew grid seats. Spectators and the (unused) TV seat are displays, not
  // suspects — the same filter the presence dock uses. The HOST is a normal
  // contestant seat here; the crown tag on their card is the only difference.
  // Ordering is HOST FIRST, then A→Z — byte-identical to PlayerList's sort so
  // a seat number on the board always names the same person as the rail row.
  const rosterPlayers = useMemo(
    () => lobby.players
      .filter(p => !p.isBigScreen && !p.isSpectator)
      .sort((a, b) => (a.isHost === b.isHost ? a.name.localeCompare(b.name) : a.isHost ? -1 : 1)),
    [lobby.players]
  );
  // Fleet standard: always show at least 3 seats so every lobby reads the same.
  // Ghost seats are display-only — the start gate still runs off minPlayers.
  const seatedCount = rosterPlayers.filter(p => p.connected).length;
  const seatFloor = Math.max(minPlayers, 3);
  const emptySeats = Math.max(0, seatFloor - seatedCount);
  const seatCount = rosterPlayers.length + emptySeats;
  const seatCols = seatCount <= 4 ? Math.max(seatCount, 1) : Math.min(4, Math.ceil(seatCount / 2));
  const seatRows = Math.max(1, Math.ceil(seatCount / seatCols));

  const handleStartGame = useCallback(() => {
    if (!canStart) return;
    socket?.emit('game:start', {});
  }, [canStart, socket]);

  const handleKickPlayer = useCallback((playerId: string) => {
    socket?.emit('player:kick', { roomCode: lobby.code, playerId });
  }, [socket, lobby.code]);

  const handleMakeHost = useCallback((playerId: string) => {
    socket?.emit('host:transfer', { roomCode: lobby.code, playerId });
  }, [socket, lobby.code]);

  // Webcam players for the video modal (exclude self — local stream handled separately)
  const webcamPlayers: WebcamPlayer[] = useMemo(() =>
    lobby.players
      .filter(p => p.socketId !== lobby.mySocketId)
      .map(p => ({
        id: p.socketId,
        name: p.name,
        avatarUrl: p.avatarUrl,
      })),
    [lobby.players, lobby.mySocketId]
  );

  const handleOpenChat = useCallback(() => {
    setDrawerContent('chat');
    setUnreadCount(0);
  }, []);

  const handleOpenPlayers = useCallback(() => {
    setDrawerContent('players');
  }, []);

  const handleOpenVideo = useCallback(() => {
    if (isVideoChatActive) {
      setDrawerContent('video');
    } else {
      prepareVideoChat();
    }
  }, [isVideoChatActive, prepareVideoChat]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerContent(null);
  }, []);

  useEffect(() => {
    if (!isVideoChatActive) {
      hasAutoOpenedVideoRef.current = false;
    }
  }, [isVideoChatActive]);

  useEffect(() => {
    if (isMobile && isVideoChatActive && !hasAutoOpenedVideoRef.current) {
      hasAutoOpenedVideoRef.current = true;
      setDrawerContent('video');
    }
  }, [isMobile, isVideoChatActive]);

  // PresenceDock: everyone visible while waiting
  const dockPlayers: DockPlayer[] = useMemo(() =>
    lobby.players
      .filter(p => !p.isBigScreen && !p.isSpectator)
      .map(p => ({
        id: p.id ?? p.socketId,
        name: p.name,
        avatarUrl: p.avatarUrl,
        isHost: p.isHost,
        isMe: p.socketId === lobby.mySocketId,
        connected: p.connected,
      })),
    [lobby.players, lobby.mySocketId]
  );

  if (!socket) return null;

  return (
    <>
      <div className="app-layout lobby-page">
        <GameShell
          hud={
            <GameHeader
              lobby={lobby}
              gameBuddiesSession={gameBuddiesSession}
              onOpenChat={handleOpenChat}
              onOpenPlayers={handleOpenPlayers}
              onOpenVideo={handleOpenVideo}
              unreadChatCount={unreadCount}
            />
          }
          rail={
            <SidebarTabs
              activeTab={activeSidebarTab}
              onTabChange={setActiveSidebarTab}
              playerCount={connectedPlayers.length}
              unreadCount={unreadCount}
            >
              {activeSidebarTab === 'players' ? (
                <PlayerList
                  players={lobby.players}
                  mySocketId={lobby.mySocketId}
                  isHost={isHost}
                  onKickPlayer={isHost ? handleKickPlayer : undefined}
                  onMakeHost={isHost ? handleMakeHost : undefined}
                  onOpenDesigner={() => setShowDesigner(true)}
                  showCardStylePicker
                />
              ) : (
                <ChatWindow
                  messages={chatMessages}
                  roomCode={lobby.code}
                  mySocketId={lobby.mySocketId}
                />
              )}
            </SidebarTabs>
          }
          railUnread={unreadCount}
          railLabel={t('chat.title')}
          dock={<PresenceDock players={dockPlayers} />}
        >
          <div className="gs-stage-inner">
            <Scene className="gs-lobby-scene">
              <SceneHeader>
                {/* Fleet standard: one hero line + the ? button. No player
                    count, no eyebrow, no game name. */}
                <div className="lobby-waiting-header">
                  <h2 className="lobby-waiting-title">{t('game.waitingForPlayers')}</h2>
                  <GameExplainerHelpButton gameId={GAME_META.id} ariaLabel={t('tutorial.howToPlay')} />
                </div>
              </SceneHeader>

              <SceneBody className="gs-lobby-body">
                {/* Crew pane is DOM-FIRST (phones = invite-first flow); the
                    desktop board places BRIEFING narrow left and CREW wide
                    right by explicit grid placement — same arrangement as
                    Bad Actor / BlindSpot / Bluffalo. */}
                <div className="gs-lobby-panes gs-lobby-cols">
                  {/* CREW — the suspects board: who is at the table, and how
                      to get more of them here. */}
                  <div className="gs-pane lobby-waiting-card gs-lobby-col gs-lobby-col--crew">
                    <div className="gs-pane-scroll gs-crew-scroll">
                      <div className="gs-crew">
                        <div className="gs-crew__head">
                          <h3 className="gs-crew__title">{tShell('lobby.players')}</h3>
                        </div>
                        <ul
                          className="gs-crew__grid"
                          aria-label={tShell('lobby.players')}
                          style={{ '--gs-cols': seatCols, '--gs-rows': seatRows } as React.CSSProperties}
                        >
                          {rosterPlayers.map((p, i) => (
                            <CrewCard
                              key={p.id ?? p.socketId}
                              p={p}
                              index={i}
                              isMe={p.socketId === lobby.mySocketId}
                            />
                          ))}
                          {Array.from({ length: emptySeats }, (_, i) => (
                            <li
                              key={`seat-${i}`}
                              className="gs-crew__card gs-crew__card--empty"
                              style={{ '--i': rosterPlayers.length + i } as React.CSSProperties}
                              aria-hidden="true"
                            >
                              <span className="gs-crew__slug">
                                <span className="gs-crew__num">#{String(rosterPlayers.length + i + 1).padStart(2, '0')}</span>
                              </span>
                              <span className="gs-crew__av gs-crew__av--empty">
                                <span className="gs-crew__av-glyph">?</span>
                              </span>
                              <span className="gs-crew__name-wrap">
                                <span className="gs-crew__name">{' '}</span>
                              </span>
                              <span className="gs-crew__tag">{' '}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {!isHost && <p className="lobby-waiting-host">{t('game.waitingForHost')}</p>}

                      {/* Invite band pinned to the crew pane's bottom edge:
                          mascot | room code + actions | card-back designer. */}
                      <div className="gs-crew-invite">
                        <img
                          src={`${import.meta.env.BASE_URL}mascot.webp`}
                          alt=""
                          aria-hidden="true"
                          className="lobby-mascot px-art gs-hide-short"
                        />
                        <SoloInvitePanel
                          roomCode={lobby.code}
                          gameName={GAME_META.name}
                          minPlayers={minPlayers}
                          currentPlayers={connectedPlayers.length}
                          hideRoomCode={gameBuddiesSession?.hideRoomCode || lobby.hideRoomCode || lobby.isStreamerMode}
                        />
                        {/* Identity designer entry. Was a hardcoded English
                            string behind a system emoji; now a noir line icon
                            plus the designer's own title, so the button and the
                            modal it opens say the same word in every language. */}
                        <button type="button" className="ps-designer-btn" onClick={() => setShowDesigner(true)}>
                          <CardBackIcon />
                          {tShell('designer.cardBackTitle')}
                        </button>
                      </div>
                    </div>
                    <ScrollHint watch="prev" />
                  </div>

                  {/* BRIEFING — host settings, or the guest's read-only case
                      briefing. Never an empty pane (standard rule 6). */}
                  <div className={`gs-pane lobby-waiting-card lobby-settings-pane gs-lobby-col gs-lobby-col--brief${isHost ? '' : ' is-guest'}`}>
                    <div className="gs-pane-scroll">
                      {isHost ? (
                        isMobile ? (
                          <CollapsibleSection title={t('settings.title')}>
                            <HostSettings lobby={lobby} socket={socket} isHost={isHost} />
                          </CollapsibleSection>
                        ) : (
                          <HostSettings lobby={lobby} socket={socket} isHost={isHost} />
                        )
                      ) : (
                        <GuestBriefingPanel lobby={lobby} />
                      )}
                      {/* One-viewport directive (rule 7): the explainer NEVER
                          renders in-pane — desktop included. It stays mounted
                          (display:none) so the first-visit auto-open and the
                          header ?-button's body-portaled modal keep working. */}
                      <div style={{ display: 'none' }}>
                        <GameExplainer
                          gameId={GAME_META.id}
                          demoSpec={primeSuspectDemoSpec}
                          t={(key: string) => getTranslation(key, language)}
                        />
                      </div>
                    </div>
                    <ScrollHint watch="prev" />
                  </div>
                </div>
              </SceneBody>

              {/* Host-only action bar. The non-host "waiting for host" message
                  lives once in the right settings pane above — it was previously
                  duplicated here, showing twice on mobile. */}
              {isHost && (
                <SceneActions>
                  <div className="lobby-start-section">
                    <button
                      onClick={handleStartGame}
                      disabled={!canStart}
                      className={`lobby-start-btn${startHint ? ' idle-hint' : ''}`}
                    >
                      <Play className="w-5 h-5" />
                      {t('game.startGame')}
                    </button>
                    {!canStart && (
                      <p className="lobby-start-hint">
                        {t('game.needMorePlayers').replace('{count}', String(connectedPlayers.length))}
                      </p>
                    )}
                  </div>
                </SceneActions>
              )}
            </Scene>
          </div>
        </GameShell>
      </div>

      <MobileDrawer
        isOpen={drawerContent !== null}
        content={drawerContent}
        onClose={handleCloseDrawer}
        messages={chatMessages}
        roomCode={lobby.code}
        mySocketId={lobby.mySocketId}
        players={lobby.players}
        isHost={isHost}
        onKickPlayer={isHost ? handleKickPlayer : undefined}
        onMakeHost={isHost ? handleMakeHost : undefined}
        webcamPlayers={webcamPlayers}
        localPlayerName={myPlayer?.name}
        onLeaveVideo={disableVideoChat}
        teams={[]}
        showCardStylePicker
        onOpenDesigner={() => { handleCloseDrawer(); setShowDesigner(true); }}
      />

      {/* "Your card back" designer — the only place ps_style items are bought. */}
      {showDesigner && (
        <React.Suspense fallback={null}>
          <CardBackDesigner
            players={lobby.players}
            mySocketId={lobby.mySocketId}
            onClose={() => setShowDesigner(false)}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default LobbyPage;
