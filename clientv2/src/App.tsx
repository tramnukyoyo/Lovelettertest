import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { initAnalytics, trackPhaseFromRoomState } from './services/analyticsService';
import { initErrorReporter } from './services/errorReporter';
import socketService from './services/socketService';
import { isDiscordActivity } from './services/discordActivity';
import { useGameBuddiesClient } from './hooks/useGameBuddiesClient';
import type { RegisterGameEventsHelpers } from './hooks/useGameBuddiesClient';
import KickToast from './components/ui/KickToast';
import SiteNotificationToast from './components/ui/SiteNotificationToast';
import type { SiteNotification } from './components/ui/SiteNotificationToast';
import AdminMessageToast from './components/ui/AdminMessageToast';
import type { AdminMessage } from './components/ui/AdminMessageToast';
import type { Lobby } from './types';
import { getTranslation, getCurrentLanguage } from './utils/gameTranslations';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebRTCProvider, useWebRTC } from './contexts/WebRTCContext';
import { VideoUIProvider, useVideoUI } from './contexts/VideoUIContext';
import { DeviceSettingsModal, VideoFilmstrip, StreamerBroadcastWindow } from './components/video';
import { useVideoKeyboardShortcuts, useVideoPreferences, useIsMobile } from './hooks';
import { backgroundMusic, soundEffects, playBackgroundMusic, initAudio } from './utils/audio';
import HomePage from './pages/HomePage';
import PaperDeductionBackdrop from './components/ui/decor/PaperDeductionBackdrop';
// GamePage is code-split: it is only needed once a room exists (its chunk is
// warmed while players sit in the lobby). HomePage stays eager — it is the
// critical path for direct visits and platform handoffs. Prime Suspect's whole
// LOBBY/PLAYING/ENDED experience lives inside GamePage (the self-contained
// HeartsGambitGame), so there is no separate LobbyPage route.
const GamePage = lazy(() => import('./pages/GamePage'));
import { InstallPrompt } from './components/InstallPrompt';
import { AdProvider } from './components/ads';
import ReconnectOverlay from './components/core/ReconnectOverlay';
import { MotionConfig } from 'framer-motion';
import type { WebcamPlayer } from './config/WebcamConfig';
import type { Socket } from 'socket.io-client';
import { stabilize } from './utils/stableState';

const AUDIO_STORAGE_KEYS = {
  MUSIC_VOLUME: 'gamebuddies-music-volume',
  MUSIC_ENABLED: 'gamebuddies-music-enabled',
  SFX_VOLUME: 'gamebuddies-sfx-volume',
  SFX_ENABLED: 'gamebuddies-sfx-enabled',
};

/** Translate a server game log message. Messages are JSON `{key, params}` objects. */
function translateGameMessage(rawMessage: string): string {
  try {
    if (!rawMessage.startsWith('{')) return rawMessage;
    const { key, params } = JSON.parse(rawMessage) as { key: string; params: Record<string, string> };
    const lang = getCurrentLanguage();
    let text = getTranslation(key as any, lang);
    if (text === key) return rawMessage;
    for (const [k, v] of Object.entries(params || {})) {
      let translated = v;
      if (typeof v === 'string' && v.startsWith('card.')) {
        translated = getTranslation(v as any, lang);
      }
      text = text.replace(`{${k}}`, translated);
    }
    return text;
  } catch {
    return rawMessage;
  }
}

// Synchronously detect a GameBuddies launch from URL params so the lobby can
// suppress the homepage flash before the socket session resolves.
function hasGameBuddiesSessionToken(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('session')) return true;
  const hasRoom = !!(params.get('room') || params.get('gbRoomCode'));
  const hasPlayerContext = !!(
    params.get('name') || params.get('playerName') ||
    params.get('playerId') || params.get('role')
  );
  return hasRoom && hasPlayerContext;
}

// Stable empty-array reference — defeats VideoFilmstrip memo() churn.
const EMPTY_TEAMS: never[] = [];

function VideoHooksManager() {
  useVideoKeyboardShortcuts();
  useVideoPreferences();
  return null;
}

function VideoSettingsManager() {
  const { isVideoPrepairing, confirmVideoChat, cancelVideoPreparation } = useWebRTC();
  const { isSettingsOpen, closeSettings } = useVideoUI();

  const isOpen = isVideoPrepairing || isSettingsOpen;
  const mode = isVideoPrepairing ? 'setup' : 'edit';

  const handleClose = () => {
    if (isVideoPrepairing) cancelVideoPreparation();
    else closeSettings();
  };

  const handleConfirm = () => {
    if (isVideoPrepairing) confirmVideoChat();
    else closeSettings();
  };

  return (
    <DeviceSettingsModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      mode={mode}
    />
  );
}

function AppContent({
  lobby,
  renderContent,
}: {
  lobby: Lobby | null;
  renderContent: () => React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const { isVideoChatActive } = useWebRTC();

  const webcamPlayers: WebcamPlayer[] = useMemo(() => lobby?.players
    .filter(p => p.socketId !== lobby.mySocketId)
    .map(p => ({
      id: p.socketId,
      name: p.name,
      avatarUrl: p.avatarUrl
    })) || [], [lobby?.players, lobby?.mySocketId]);

  const localPlayerName = useMemo(
    () => lobby?.players.find(p => p.socketId === lobby.mySocketId)?.name,
    [lobby?.players, lobby?.mySocketId]
  );

  const showFilmstrip = lobby && !isMobile && !isDiscordActivity();
  const showBroadcast = lobby && isVideoChatActive;

  return (
    <div className={`app-root ${lobby ? 'in-room' : ''}`}>
      {/* Animated CSS noir scenery behind all content (home + in-game). */}
      <PaperDeductionBackdrop />
      {renderContent()}
      {showFilmstrip && (
        <VideoFilmstrip
          players={webcamPlayers}
          roomCode={lobby!.code}
          localPlayerName={localPlayerName}
          teams={EMPTY_TEAMS}
          mySocketId={lobby!.mySocketId}
        />
      )}
      {showBroadcast && (
        <StreamerBroadcastWindow
          lobby={lobby!}
          players={webcamPlayers}
          localPlayerName={localPlayerName}
          mySocketId={lobby!.mySocketId}
        />
      )}
    </div>
  );
}

function App() {
  // Force re-render when language changes (no page reload needed)
  const [, setLangVersion] = useState(0);
  useEffect(() => {
    const onLangChange = () => setLangVersion(v => v + 1);
    window.addEventListener('languagechange', onLangChange);
    return () => window.removeEventListener('languagechange', onLangChange);
  }, []);

  const [siteNotification, setSiteNotification] = useState<SiteNotification | null>(null);
  const [adminMessage, setAdminMessage] = useState<AdminMessage | null>(null);
  const [restoreInfo, setRestoreInfo] = useState<{ phase: string; connectedCount: number; totalPlayers: number } | null>(null);
  const audioInitialized = useRef(false);
  const lastLobbyRef = useRef<Lobby | null>(null);

  // Register extra socket events not covered by the core hook
  const registerGameEvents = useCallback((socket: Socket, helpers: RegisterGameEventsHelpers) => {
    const applyAndSetLobby = (next: Lobby) => {
      const withMyId = { ...next, mySocketId: next.mySocketId ?? socket.id };
      const stabilized = stabilize(lastLobbyRef.current as unknown as Record<string, unknown> | null, withMyId as unknown as Record<string, unknown>) as unknown as Lobby;
      lastLobbyRef.current = stabilized;
      helpers.setLobbyState(stabilized);
    };

    const onRoomStateUpdated = (data: Lobby) => {
      trackPhaseFromRoomState(data as any);
      if (data.messages) {
        data = {
          ...data,
          messages: data.messages.map(msg => ({
            ...msg,
            message: translateGameMessage(msg.message),
          })),
        };
      }
      applyAndSetLobby(data);
    };

    const returnViaDiscordParent = (): boolean => {
      if (isDiscordActivity() && typeof window !== 'undefined' && window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({ type: 'gb:return-to-lobby' }, window.location.origin);
          return true;
        } catch { /* cross-origin parent (standalone) — fall through */ }
      }
      return false;
    };

    const onReturnRedirect = (data: { returnUrl: string }) => {
      if (returnViaDiscordParent()) return;
      if (!data.returnUrl) return;
      window.location.replace(data.returnUrl);
    };

    const onLobbyRedirect = (data: { redirectUrl: string }) => {
      if (returnViaDiscordParent()) return;
      if (!data.redirectUrl) return;
      window.location.replace(data.redirectUrl);
    };

    const onSiteNotification = (data: SiteNotification) => setSiteNotification(data);
    const onAdminMessage = (data: AdminMessage) => setAdminMessage(data);

    const onGameRestored = (data: { phase: string; connectedCount: number; totalPlayers: number }) => {
      setRestoreInfo(data);
    };
    const onGameResumed = () => setRestoreInfo(null);
    const onPlayerReconnected = () => {
      setRestoreInfo(prev => prev ? { ...prev, connectedCount: prev.connectedCount + 1 } : null);
    };

    // Game log events from server (translates JSON {key,params} messages)
    const onGameLog = (data: { message: string }) => {
      helpers.patchLobby((prev) => {
        if (!prev) return prev;
        const newMessage = {
          id: crypto.randomUUID(),
          playerId: 'system',
          playerName: 'Game',
          message: translateGameMessage(data.message),
          timestamp: Date.now(),
        };
        return { ...prev, messages: [...(prev.messages || []), newMessage] };
      });
    };

    socket.on('roomStateUpdated', onRoomStateUpdated);
    socket.on('gamebuddies:return-redirect', onReturnRedirect);
    socket.on('gamebuddies:lobby-redirect', onLobbyRedirect);
    socket.on('site:notification', onSiteNotification);
    socket.on('admin:message', onAdminMessage);
    socket.on('game:restored', onGameRestored);
    socket.on('game:resumed', onGameResumed);
    socket.on('player:reconnected', onPlayerReconnected);
    socket.on('game:log', onGameLog);

    return () => {
      socket.off('roomStateUpdated', onRoomStateUpdated);
      socket.off('gamebuddies:return-redirect', onReturnRedirect);
      socket.off('gamebuddies:lobby-redirect', onLobbyRedirect);
      socket.off('site:notification', onSiteNotification);
      socket.off('admin:message', onAdminMessage);
      socket.off('game:restored', onGameRestored);
      socket.off('game:resumed', onGameResumed);
      socket.off('player:reconnected', onPlayerReconnected);
      socket.off('game:log', onGameLog);
    };
  }, []);

  const {
    lobby,
    messages,
    error,
    isConnected,
    socket,
    gameBuddiesSession,
    kickMessage,
    clearKickMessage,
    createRoom,
    joinRoom,
  } = useGameBuddiesClient({ registerGameEvents });

  const isLoadingFromGameBuddies = useMemo(() => hasGameBuddiesSessionToken(), []);

  useEffect(() => { initAnalytics(); initErrorReporter(); }, []);

  // Initialize audio system
  useEffect(() => {
    const musicVolume = localStorage.getItem(AUDIO_STORAGE_KEYS.MUSIC_VOLUME);
    const musicEnabled = localStorage.getItem(AUDIO_STORAGE_KEYS.MUSIC_ENABLED);
    const sfxVolume = localStorage.getItem(AUDIO_STORAGE_KEYS.SFX_VOLUME);
    const sfxEnabled = localStorage.getItem(AUDIO_STORAGE_KEYS.SFX_ENABLED);

    if (musicVolume) backgroundMusic.setVolume(parseInt(musicVolume, 10) / 100);
    if (musicEnabled) backgroundMusic.setMuted(musicEnabled === 'false');
    if (sfxVolume) soundEffects.setVolume(parseInt(sfxVolume, 10) / 100);
    if (sfxEnabled) soundEffects.setEnabled(sfxEnabled !== 'false');

    initAudio().catch(console.warn);
  }, []);

  // Start background music: try at mount, retry on every gesture until it plays.
  useEffect(() => {
    if (audioInitialized.current) return;

    const removeListeners = () => {
      document.removeEventListener('click', tryStart);
      document.removeEventListener('touchstart', tryStart);
      document.removeEventListener('keydown', tryStart);
    };

    const tryStart = () => {
      if (audioInitialized.current) return;
      playBackgroundMusic()
        .then(() => {
          if (backgroundMusic.isPlaying()) {
            audioInitialized.current = true;
            removeListeners();
          }
        })
        .catch(() => { /* blocked — wait for the next gesture */ });
    };

    tryStart();
    document.addEventListener('click', tryStart);
    document.addEventListener('touchstart', tryStart);
    document.addEventListener('keydown', tryStart);

    return removeListeners;
  }, []);

  const handleCreateRoom = useCallback((playerName: string, streamerMode?: boolean) => {
    createRoom(playerName, gameBuddiesSession, streamerMode);
  }, [createRoom, gameBuddiesSession]);

  const handleJoinRoom = useCallback((roomCode: string, playerName: string) => {
    joinRoom(roomCode, playerName, gameBuddiesSession);
  }, [joinRoom, gameBuddiesSession]);

  const handleJoinWithInvite = useCallback((inviteToken: string, playerName: string) => {
    joinRoom(inviteToken, playerName, gameBuddiesSession);
  }, [joinRoom, gameBuddiesSession]);

  const handleLeave = useCallback(() => {
    socketService.clearReconnectionData();
    window.location.href = window.location.pathname;
  }, []);

  // Warm the code-split GamePage chunk while players sit in the lobby.
  useEffect(() => {
    if (lobby) {
      import('./pages/GamePage').catch(() => { /* fetched again on render */ });
    }
  }, [!!lobby]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderContent = () => {
    if (isLoadingFromGameBuddies && !lobby) {
      return null;
    }
    if (!lobby) {
      return (
        <HomePage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onJoinWithInvite={handleJoinWithInvite}
          isConnecting={!isConnected}
          error={error}
        />
      );
    }

    // Prime Suspect routes ALL in-room states (LOBBY / PLAYING / ENDED) through
    // the self-contained game component housed in GamePage.
    return (
      <GamePage
        lobby={lobby}
        messages={messages}
        gameBuddiesSession={gameBuddiesSession}
        onLeave={handleLeave}
      />
    );
  };

  const myPlayer = lobby?.players?.find(p => p.socketId === socket?.id);
  const isPremium = myPlayer?.premiumTier && myPlayer.premiumTier !== 'free';

  return (
    <MotionConfig reducedMotion="user">
    <ThemeProvider>
      <AdProvider isPremium={isPremium}>
        <WebRTCProvider socket={socket} roomCode={lobby?.code || null}>
          <VideoUIProvider>
            <AppContent lobby={lobby} renderContent={() => (
              <Suspense fallback={null}>{renderContent()}</Suspense>
            )} />
            <VideoHooksManager />
            <VideoSettingsManager />
            <InstallPrompt />
            {restoreInfo && (
              <ReconnectOverlay
                phase={restoreInfo.phase}
                connectedCount={restoreInfo.connectedCount}
                totalPlayers={restoreInfo.totalPlayers}
                isHost={!!myPlayer?.isHost}
                onResume={() => socket?.emit('game:resume')}
              />
            )}
            <KickToast message={kickMessage} onClose={clearKickMessage} />
            <SiteNotificationToast notification={siteNotification} onClose={() => setSiteNotification(null)} />
            <AdminMessageToast
              message={adminMessage}
              onReply={(threadId, body) => socketService.getSocket()?.emit('admin:message:reply', { threadId, body })}
              onClose={() => setAdminMessage(null)}
            />
          </VideoUIProvider>
        </WebRTCProvider>
      </AdProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}

export default App;
