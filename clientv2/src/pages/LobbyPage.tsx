/**
 * Lobby Page — Prime Suspect
 *
 * Standard GameBuddies two-pane lobby (LEFT invite/players card + RIGHT host
 * settings/explainer card) housed inside the shared GameShell, matching the
 * other games. The bespoke detective card table (HeartsGambitGame) is now used
 * ONLY for PLAYING / ENDED — LobbyPage owns the LOBBY state.
 *
 * Shell wiring (header / rail / drawer / video / dock) mirrors GamePage so the
 * shell stays consistent across phases.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import type { Lobby, ChatMessage } from '../types';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import type { WebcamPlayer } from '../config/WebcamConfig';
import socketService from '../services/socketService';
import { getTranslation, getCurrentLanguage } from '../utils/gameTranslations';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { GameHeader, SidebarTabs } from '../components/core';
import type { SidebarTab } from '../components/core';
import { ChatWindow, PlayerList, SoloInvitePanel } from '../components/lobby';
import { GameExplainer, GameExplainerHelpButton } from '../components/lobby/GameExplainer';
import { primeSuspectDemoSpec } from '../components/lobby/GameExplainer/demos/PrimeSuspectDemo';
import '../components/lobby/GameExplainer/GameExplainer.css';
import HostSettings from '../components/lobby/HostSettings';
import CollapsibleSection from '../components/core/CollapsibleSection';
import { GAME_META } from '../config/gameMeta';
import { MobileDrawer } from '../components/mobile';
import type { DrawerContent } from '../components/mobile';
import GameShell from '../shell/GameShell';
import PresenceDock from '../shell/PresenceDock';
import ScrollHint from '../shell/ScrollHint';
import type { DockPlayer } from '../shell/PresenceDock';
import { Scene, SceneHeader, SceneBody, SceneActions } from '../shell/Scene';

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
        cardStyle: p.cardStyle,
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
                <div
                  className="lobby-waiting-header"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                >
                  <h2 style={{ margin: 0 }}>{t('game.waitingForPlayers')}</h2>
                  <GameExplainerHelpButton gameId={GAME_META.id} ariaLabel={t('tutorial.howToPlay')} />
                </div>
              </SceneHeader>

              <SceneBody>
                <div className="gs-lobby-panes">
                  {/* LEFT — invite + players */}
                  <div className="gs-pane lobby-waiting-card">
                    <div className="gs-pane-scroll">
                    <img
                      src={`${import.meta.env.BASE_URL}mascot.webp`}
                      alt=""
                      aria-hidden="true"
                      className="lobby-mascot px-art gs-hide-short"
                    />
                    <div className="lobby-pane-scroll">
                      <SoloInvitePanel
                        roomCode={lobby.code}
                        gameName={GAME_META.name}
                        minPlayers={minPlayers}
                        currentPlayers={connectedPlayers.length}
                        hideRoomCode={gameBuddiesSession?.hideRoomCode || lobby.hideRoomCode || lobby.isStreamerMode}
                      />
                      {/* Player list lives in the sidebar rail (Spieler tab) — no
                          duplicate in the center pane. */}
                      </div>
                      <ScrollHint watch="prev" />
                    </div>
                  </div>

                  {/* RIGHT — host settings + explainer */}
                  <div className="gs-pane lobby-waiting-card lobby-settings-pane">
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
                      <p className="lobby-waiting-host">{t('game.waitingForHost')}</p>
                    )}
                    <div className="lobby-pane-scroll">
                      {!isMobile && (
                        <div className="gs-collapse-short" style={{ width: '100%' }}>
                          <GameExplainer
                            gameId={GAME_META.id}
                            demoSpec={primeSuspectDemoSpec}
                            t={(key: string) => getTranslation(key, language)}
                          />
                        </div>
                      )}
                      {/* Mobile: mount the explainer offscreen so the header Help
                          button (which flips the shared explainer store) can open
                          its modal. The modal portals to <body>, so a hidden host
                          is fine and the closed-state sidebar stays out of the way. */}
                      {isMobile && (
                        <div style={{ display: 'none' }}>
                          <GameExplainer
                            gameId={GAME_META.id}
                            demoSpec={primeSuspectDemoSpec}
                            t={(key: string) => getTranslation(key, language)}
                          />
                        </div>
                      )}
                      </div>
                      <ScrollHint watch="prev" />
                    </div>
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
                      className="lobby-start-btn"
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
      />
    </>
  );
};

export default LobbyPage;
