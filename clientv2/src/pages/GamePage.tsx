/**
 * Game Page — Prime Suspect (Heart's Gambit)
 *
 * The LOBBY / PLAYING / ENDED experience is now housed inside the shared
 * GameShell (top header bar + right player/chat rail + presence dock), to
 * match the other GameBuddies games. The card table (HeartsGambitGame) becomes
 * the GameShell stage content. Pass & Play renders the mobile game directly
 * (no shell) exactly like before.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import HeartsGambitGame from '../components/hearts-gambit/HeartsGambitGame';
import HeartsGambitGameMobile from '../components/hearts-gambit/HeartsGambitGameMobile';
import LobbyPage from './LobbyPage';
import { usePassPlay } from '../hooks/usePassPlay';
import { getTranslation, getCurrentLanguage } from '../utils/gameTranslations';
import { Eye, ChevronRight } from 'lucide-react';
import type { Lobby, ChatMessage } from '../types';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import type { WebcamPlayer } from '../config/WebcamConfig';
import socketService from '../services/socketService';
import { GameHeader, SidebarTabs, SpectatorBanner } from '../components/core';
import type { SidebarTab } from '../components/core';
import { ChatWindow, PlayerList } from '../components/lobby';
import { MobileDrawer } from '../components/mobile';
import type { DrawerContent } from '../components/mobile';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useIsMobile } from '../hooks/useIsMobile';
import GameShell from '../shell/GameShell';
import PresenceDock from '../shell/PresenceDock';
import type { DockPlayer } from '../shell/PresenceDock';
import { XpToast } from '../components/ui/XpToast';

interface GamePageProps {
  lobby: Lobby;
  messages?: ChatMessage[];
  gameBuddiesSession?: GameBuddiesSession | null;
  onLeave?: () => void;
}

interface XpReward {
  reward: { totalXp: number; summary: string; breakdown: any };
  progress: { newLevel: number; previousLevel: number; leveledUp: boolean; percentage: number };
}

const PPProgressDots: React.FC<{ currentIndex: number; total: number }> = ({ currentIndex, total }) => (
  <div className="pp-progress">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`pp-progress-dot ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}
      />
    ))}
  </div>
);

const GamePage: React.FC<GamePageProps> = ({ lobby, messages = [], gameBuddiesSession, onLeave }) => {
  const socket = socketService.getSocket();
  // Player chat ONLY (system / game-log events belong in the Case Log, not chat).
  const chatMessages = messages.filter(m => m.playerId !== 'system' && !m.isSystem);
  const [showPassModal, setShowPassModal] = useState(false);
  const [prevTurn, setPrevTurn] = useState<string | undefined>();
  const [xpReward, setXpReward] = useState<XpReward | null>(null);
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  // Shell state (header / rail / drawer / video)
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('players');
  const [drawerContent, setDrawerContent] = useState<DrawerContent>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastMessageCountRef = useRef(chatMessages.length);
  const hasAutoOpenedVideoRef = useRef(false);

  const { prepareVideoChat, isVideoChatActive, disableVideoChat } = useWebRTC();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!socket) return;
    const handleReward = (data: XpReward) => setXpReward(data);
    socket.on('player:reward', handleReward);
    return () => { socket.off('player:reward', handleReward); };
  }, [socket]);

  // Track unread chat for the rail / header badges (chat-only, excludes log)
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

  const webcamPlayers: WebcamPlayer[] = useMemo(() =>
    lobby.players
      .filter(p => p.socketId !== lobby.mySocketId)
      .map(p => ({
        id: p.socketId,
        name: p.name,
        avatarUrl: p.avatarUrl
      })),
    [lobby.players, lobby.mySocketId]
  );

  const pp = usePassPlay({
    roomCode: lobby.code,
    players: lobby.players,
    passPlay: lobby.passPlay,
    settings: lobby.settings,
    socket: socket!,
  });

  // Detect turn completion: currentTurn was my PP player → now it isn't
  useEffect(() => {
    if (!pp.isPassPlay || !pp.isRevealed || !pp.currentPlayer) return;
    const currentTurn = lobby.gameData?.currentTurn;
    const myId = pp.currentPlayer.id;
    if (prevTurn === myId && currentTurn !== myId) {
      setShowPassModal(true);
    }
    setPrevTurn(currentTurn ?? undefined);
  }, [lobby.gameData?.currentTurn, pp.isPassPlay, pp.isRevealed, pp.currentPlayer?.id, prevTurn]);

  // Not my turn on reveal → show pass modal after a brief view
  useEffect(() => {
    if (!pp.isPassPlay || !pp.isRevealed || !pp.currentPlayer) return;
    const isMyTurn = lobby.gameData?.currentTurn === pp.currentPlayer.id;
    if (!isMyTurn) {
      const timer = setTimeout(() => setShowPassModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [pp.isRevealed, pp.currentPlayer?.id]);

  // Reset on player change (advance to next PP player)
  useEffect(() => {
    setShowPassModal(false);
    setPrevTurn(undefined);
  }, [pp.currentPlayerIndex]);

  const isSpectator = lobby.players.find(p => p.socketId === lobby.mySocketId)?.isSpectator || false;
  const isHost = lobby.players.find(p => p.socketId === lobby.mySocketId)?.isHost || false;
  const handleKickPlayer = useCallback((playerId: string) => {
    socket?.emit('player:kick', { roomCode: lobby.code, playerId });
  }, [socket, lobby.code]);
  const handleMakeHost = useCallback((playerId: string) => {
    socket?.emit('host:transfer', { roomCode: lobby.code, playerId });
  }, [socket, lobby.code]);
  const viewingAs = (lobby as any).viewingAs
    ? lobby.players.find(p => p.socketId === (lobby as any).viewingAs)
    : null;
  const handleResetView = useCallback(() => {
    socket?.emit('spectator:view-as', { targetSocketId: null });
  }, [socket]);
  const handleSpectatorPlayerClick = useCallback((targetSocketId: string) => {
    if (!isSpectator) return;
    socket?.emit('spectator:view-as', { targetSocketId });
  }, [socket, isSpectator]);

  // PresenceDock: ambient player presence (token count + per-phase status)
  const dockPlayers: DockPlayer[] = useMemo(() => {
    return lobby.players
      .filter(p => !p.isBigScreen && !p.isSpectator)
      .map(p => ({
        id: p.id ?? p.socketId,
        name: p.name,
        avatarUrl: p.avatarUrl,
        score: p.tokens,
        isHost: p.isHost,
        isMe: p.socketId === lobby.mySocketId,
        connected: p.connected,
        status: lobby.state === 'PLAYING'
          ? (p.isEliminated ? undefined : 'waiting')
          : undefined,
      }));
  }, [lobby.players, lobby.state, lobby.mySocketId]);

  if (!socket) return null;

  // Pass & Play during PLAYING phase — render game directly, no shell wrapper
  if (pp.isPassPlay && pp.currentPlayer && lobby.state === 'PLAYING') {
    if (!pp.isRevealed) {
      return (
        <div className="pp-transition-screen">
          <p className="pp-pass-label">{t('passPlay.passDeviceTo')}</p>
          <h2 className="pp-player-name-display">{pp.currentPlayer.name}</h2>
          <div className="pp-privacy-card">
            <span className="pp-privacy-icon">🔒</span>
            <span className="pp-privacy-text">
              {t('passPlay.onlyPlayerLooking').replace('{name}', pp.currentPlayer.name)}
            </span>
          </div>
          <button className="pp-reveal-btn" onClick={pp.reveal}>
            <Eye size={20} /> {t('passPlay.reveal')}
          </button>
          <PPProgressDots currentIndex={pp.currentPlayerIndex} total={lobby.passPlay?.turnOrder.length ?? 0} />
        </div>
      );
    }

    return (
      <>
        <HeartsGambitGameMobile
          lobby={lobby}
          socket={socket}
          ppActivePlayerId={pp.currentPlayer.id}
          ppActionHandler={pp.action}
        />
        {showPassModal && (
          <div className="pp-advance-modal">
            <div className="pp-advance-modal-card">
              <span className="pp-advance-check">&#10003;</span>
              <p className="pp-advance-label">{t('passPlay.actionSubmitted')}</p>
              <button className="pp-advance-btn" onClick={pp.advance}>
                <ChevronRight size={20} />
                {t('passPlay.donePassDevice')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  switch (lobby.state) {
    case 'LOBBY':
      return (
        <LobbyPage
          lobby={lobby}
          messages={messages}
          gameBuddiesSession={gameBuddiesSession}
          onLeave={onLeave}
        />
      );

    case 'PLAYING':
    case 'ENDED':
      return (
        <>
          <div className="app-layout game-page">
            <GameShell
              chromeAutoHide
              hud={
                <>
                  {isSpectator && (
                    <SpectatorBanner
                      viewingAs={viewingAs ? { id: viewingAs.id, name: viewingAs.name } : null}
                      onResetView={handleResetView}
                    />
                  )}
                  <GameHeader
                    lobby={lobby}
                    gameBuddiesSession={gameBuddiesSession}
                    onOpenChat={handleOpenChat}
                    onOpenPlayers={handleOpenPlayers}
                    onOpenVideo={handleOpenVideo}
                    unreadChatCount={unreadCount}
                  />
                </>
              }
              rail={
                <SidebarTabs
                  activeTab={activeSidebarTab}
                  onTabChange={setActiveSidebarTab}
                  playerCount={lobby.players.filter(p => p.connected).length}
                  unreadCount={unreadCount}
                >
                  {activeSidebarTab === 'players' ? (
                    <PlayerList
                      players={lobby.players}
                      mySocketId={lobby.mySocketId}
                      isHost={isHost}
                      onKickPlayer={isHost ? handleKickPlayer : undefined}
                      onMakeHost={isHost ? handleMakeHost : undefined}
                      isSpectator={isSpectator}
                      viewingAsSocketId={(lobby as any).viewingAs}
                      onPlayerClick={handleSpectatorPlayerClick}
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
                <HeartsGambitGame lobby={lobby} socket={socket} />
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
            localPlayerName={lobby.players.find(p => p.socketId === lobby.mySocketId)?.name}
            onLeaveVideo={disableVideoChat}
            teams={[]}
          />

          <XpToast reward={xpReward} onClose={() => setXpReward(null)} />
        </>
      );

    default:
      return <div>Unknown game state: {lobby.state}</div>;
  }
};

export default GamePage;
