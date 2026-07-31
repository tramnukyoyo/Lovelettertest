import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { initAnalytics, trackPhaseFromRoomState } from './services/analyticsService';
import { initErrorReporter } from './services/errorReporter';
import { prefetchLobbyAssets } from './services/lobbyPrefetch';
import socketService from './services/socketService';
import { registerCosmeticsShopEvents, clearCosmeticsShop } from './services/cosmeticsShop';
import { registerPlatformCosmeticsEvents, clearPlatformCosmetics } from './services/platformCosmetics';
import { isDiscordActivity } from './services/discordActivity';
import { useGameBuddiesClient } from './hooks/useGameBuddiesClient';
import type { RegisterGameEventsHelpers } from './hooks/useGameBuddiesClient';
import KickToast from './components/ui/KickToast';
import SiteNotificationToast from './components/ui/SiteNotificationToast';
import type { SiteNotification } from './components/ui/SiteNotificationToast';
import AdminMessageToast from './components/ui/AdminMessageToast';
import MessagesPanel from './components/ui/MessagesPanel';
import { registerAdminInboxEvents, clearAdminInbox } from './services/adminInbox';
import type { Lobby, PlayerPlatformProfile } from './types';
import { setPlayerProfile } from './services/playerProfiles';
import { initSupabaseAuth, maybeUpgradeRoomIdentity, useAuthState } from './services/supabaseAuth';
import {
  setPostgameRewards,
  setRematchState,
  setRematchGo,
  setCrewStreak,
  addUnlock,
  type PostgameRewardEntry,
  type PostgameUnlock,
} from './services/postgame';
import { getTranslation, getCurrentLanguage } from './utils/gameTranslations';
import { t } from './utils/translations';
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
import FreezeOverlay from './components/core/FreezeOverlay';
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
      // If the room dropped back to lobby (game ended/restarted while the
      // ReconnectOverlay was up), clear the overlay so non-host players aren't
      // stuck waiting for a host that won't resume. Prime Suspect's state enum
      // is uppercase ('LOBBY'), not the generic 'lobby'.
      if (data.state === 'LOBBY') setRestoreInfo(null);
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

    // Platform profile hydration: game server sends each player's aggregate
    // GameBuddies profile (level, GP, streak, cosmetics, achievements) once
    // shortly after they join. Kept in a store outside lobby state so full
    // room-state broadcasts can't wipe it.
    const onPlayerProfile = (data: { playerId: string; profile: PlayerPlatformProfile }) => {
      if (data?.playerId && data?.profile) {
        setPlayerProfile(data.playerId, data.profile);
      }
    };

    // Post-game screen: shared rewards summary + rematch vote + crew streak.
    const onPostgameSummary = (data: { rewards?: PostgameRewardEntry[] }) => {
      // Warm the platform lobby's hashed assets so Return-to-Lobby paints
      // from cache once the post-game summary lands.
      void prefetchLobbyAssets();
      if (Array.isArray(data?.rewards)) setPostgameRewards(data.rewards);
    };
    const onRematchUpdate = (data: { votes?: number; needed?: number; voters?: string[] }) => {
      if (typeof data?.votes === 'number' && typeof data?.needed === 'number') {
        setRematchState({ votes: data.votes, needed: data.needed, voters: data.voters || [] });
      }
    };
    const onRematchGo = () => setRematchGo();
    const onCrewStreak = (data: { gamesTonight?: number; weekStreak?: number }) => {
      if (typeof data?.gamesTonight === 'number') {
        setCrewStreak({ gamesTonight: data.gamesTonight, weekStreak: data.weekStreak ?? 0 });
      }
    };
    const onAchievementUnlocked = (data: PostgameUnlock) => {
      if (data?.playerId && data?.achievement?.id) addUnlock(data);
    };

    // In-room server rejections (content filter, validation, permission
    // errors). The core hook stores these in `error`, but that state only
    // renders pre-lobby (HomePage/BigScreenPage) — in a room the rejection
    // was invisible and players thought the game was bugged. Toast it.
    let lastErrToast = { msg: '', at: 0 };
    const onServerError = (data: { message?: string; code?: string }) => {
      const msg = data?.message;
      if (!msg) return;
      if (!lastLobbyRef.current) return; // pre-lobby: HomePage renders `error` inline
      if (data.code === 'NOT_IN_ROOM' || msg === 'Not in a room') return; // hook self-heals this one
      const now = Date.now();
      if (msg === lastErrToast.msg && now - lastErrToast.at < 3000) return; // rapid resubmits
      lastErrToast = { msg, at: now };
      const isFilter = data.code === 'PROFANITY_DETECTED';
      setSiteNotification({
        id: `srv-err-${now}`,
        type: 'warning',
        title: isFilter ? t('errors.contentFilterTitle') : 'Error',
        message: isFilter ? t('errors.contentFilterBody') : msg,
        target: 'all',
      });
    };

    socket.on('roomStateUpdated', onRoomStateUpdated);
    socket.on('gamebuddies:return-redirect', onReturnRedirect);
    socket.on('gamebuddies:lobby-redirect', onLobbyRedirect);
    socket.on('site:notification', onSiteNotification);
    // In-game inbox (admin ↔ player conversation) — external store, so the header
    // badge and the panel share one source of truth.
    const offAdminInbox = registerAdminInboxEvents(socket);
    socket.on('game:restored', onGameRestored);
    socket.on('game:resumed', onGameResumed);
    socket.on('player:reconnected', onPlayerReconnected);
    socket.on('game:log', onGameLog);
    socket.on('error', onServerError);
    socket.on('gb:player:profile', onPlayerProfile);
    socket.on('gb:postgame:summary', onPostgameSummary);
    socket.on('gb:postgame:rematch-update', onRematchUpdate);
    socket.on('gb:postgame:rematch-go', onRematchGo);
    socket.on('gb:postgame:crewstreak', onCrewStreak);
    socket.on('gb:achievement:unlocked', onAchievementUnlocked);

    // GP cosmetics shop (card-back designer): owned/balance state + buy results.
    const offCosmeticsShop = registerCosmeticsShopEvents(socket);
    const offPlatformCosmetics = registerPlatformCosmeticsEvents(socket);

    return () => {
      offCosmeticsShop();
      clearCosmeticsShop();
      clearPlatformCosmetics();
      offPlatformCosmetics();
      socket.off('roomStateUpdated', onRoomStateUpdated);
      socket.off('gamebuddies:return-redirect', onReturnRedirect);
      socket.off('gamebuddies:lobby-redirect', onLobbyRedirect);
      socket.off('site:notification', onSiteNotification);
      offAdminInbox();
      clearAdminInbox();
      socket.off('game:restored', onGameRestored);
      socket.off('game:resumed', onGameResumed);
      socket.off('player:reconnected', onPlayerReconnected);
      socket.off('game:log', onGameLog);
      socket.off('error', onServerError);
      socket.off('gb:player:profile', onPlayerProfile);
      socket.off('gb:postgame:summary', onPostgameSummary);
      socket.off('gb:postgame:rematch-update', onRematchUpdate);
      socket.off('gb:postgame:rematch-go', onRematchGo);
      socket.off('gb:postgame:crewstreak', onCrewStreak);
      socket.off('gb:achievement:unlocked', onAchievementUnlocked);
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

  // In-game auth (shared platform Supabase session). Prime Suspect has no TV
  // big-screen display mode, so this always initializes.
  useEffect(() => {
    initSupabaseAuth();
  }, []);

  // Live seat upgrade: whenever we're authed with the shared session and
  // seated in a room, have the server re-validate the access token and set
  // userId/isGuest/premiumTier on the seat. Must run even when the seat
  // already looks non-guest: standalone create claims our userId client-side
  // (unvalidated → premium stays 'free') — only this validation grants
  // premium. Once per (room, user); the server call is cheap + rate-limited.
  const auth = useAuthState();
  const authUpgradeFor = useRef<string | null>(null);
  useEffect(() => {
    if (!socket || !lobby || auth.status !== 'authed') return;
    const myPlayer = lobby.players.find(p => p.socketId === lobby.mySocketId);
    if (!myPlayer) return;
    const key = `${lobby.code}:${auth.userId}`;
    if (authUpgradeFor.current === key) return;
    authUpgradeFor.current = key;
    maybeUpgradeRoomIdentity();
  }, [socket, lobby, auth.status, auth.userId]);

  // Premium freshness (2026-07-16): a player who buys premium in another tab
  // (the upsell chip opens gamebuddies.io/premium) comes back to a seat still
  // marked 'free'. On tab re-focus, if we're authed but the seat has no
  // premium, re-run the seat upgrade — the server re-validates the token and
  // rebroadcasts the roster, so pickers unlock live without a rejoin.
  const premiumRefreshAt = useRef(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!socket || !lobby || auth.status !== 'authed') return;
      const me = lobby.players.find(p => p.socketId === lobby.mySocketId);
      if (!me || (me.premiumTier && me.premiumTier !== 'free')) return;
      const now = Date.now();
      if (now - premiumRefreshAt.current < 30_000) return; // server rate-limits too
      premiumRefreshAt.current = now;
      maybeUpgradeRoomIdentity();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [socket, lobby, auth.status]);

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
            {/* FREEZE-ON-DISCONNECT: socket is dead mid-game. Curtain goes over
                the still-mounted game tree (local drafts survive) until the
                connection is back; then game:restored hands off to
                ReconnectOverlay above. Rendered last so it wins the tie on
                z-index — you cannot resume a game you cannot talk to. */}
            {!isConnected && lobby && lobby.state !== 'LOBBY' && <FreezeOverlay />}
            <KickToast message={kickMessage} onClose={clearKickMessage} />
            <SiteNotificationToast notification={siteNotification} onClose={() => setSiteNotification(null)} />
            {/* Admin ↔ player conversation: a quiet arrival notice, plus the full
                thread the header's Messages button opens. Both read the same store. */}
            <AdminMessageToast />
            <MessagesPanel />
          </VideoUIProvider>
        </WebRTCProvider>
      </AdProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}

export default App;
