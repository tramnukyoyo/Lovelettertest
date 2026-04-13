import { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import ChatWindow from './components/ChatWindow';
import PlayerList from './components/PlayerList';
import { BottomTabBar } from './components/BottomTabBar';
import { MobileDrawer } from './components/MobileDrawer';
import { useMobileNavigation } from './hooks/useMobileNavigation';
import { WebRTCProvider, useWebRTC } from './contexts/WebRTCContext';
import { VideoUIProvider, useVideoUI } from './contexts/VideoUIContext';
import { WebcamConfigProvider } from './config/WebcamConfig';
import { createGameAdapter } from './adapters/gameAdapter';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import GameHeader from './components/GameHeader';
import { VideoFilmstrip, MobileVideoGrid, DeviceSettingsModal, StreamerBroadcastWindow } from './components/video';
import { useVideoKeyboardShortcuts } from './hooks/useVideoKeyboardShortcuts';
import { useVideoPreferences } from './hooks/useVideoPreferences';
import { backgroundMusic } from './utils/backgroundMusic';
import { soundEffects } from './utils/soundEffects';
import { useGameBuddiesClient } from './hooks/useGameBuddiesClient';
import InstallPrompt from './components/InstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import SiteNotificationToast from './components/ui/SiteNotificationToast';
import type { SiteNotification } from './components/ui/SiteNotificationToast';
import KickToast from './components/ui/KickToast';
import ReconnectOverlay from './components/core/ReconnectOverlay';
import socketService from './services/socketService';
import { initAnalytics } from './services/analyticsService';
import { initErrorReporter } from './services/errorReporter';
import type { RegisterGameEventsHelpers } from './hooks/useGameBuddiesClient';
import type { Lobby } from './types';
import { getTranslation, getCurrentLanguage } from './utils/translations';
import './unified.css';

/** Translate a server game log message. Messages are JSON `{key, params}` objects. */
function translateGameMessage(rawMessage: string): string {
  try {
    if (!rawMessage.startsWith('{')) {
      console.log('[translateGameMessage] plain text, skipping:', rawMessage.slice(0, 80));
      return rawMessage;
    }
    const { key, params } = JSON.parse(rawMessage) as { key: string; params: Record<string, string> };
    const lang = getCurrentLanguage();
    console.log('[translateGameMessage] key:', key, 'lang:', lang, 'params:', params);
    let text = getTranslation(key as any, lang);
    if (text === key) {
      console.warn('[translateGameMessage] KEY NOT FOUND:', key, '→ returning raw:', rawMessage.slice(0, 80));
      return rawMessage;
    }
    // Replace {placeholder} tokens – translate card keys inside params
    for (const [k, v] of Object.entries(params)) {
      let translated = v;
      if (v.startsWith('card.')) {
        translated = getTranslation(v as any, lang);
      }
      text = text.replace(`{${k}}`, translated);
    }
    console.log('[translateGameMessage] result:', text);
    return text;
  } catch (err) {
    console.error('[translateGameMessage] ERROR parsing:', rawMessage.slice(0, 80), err);
    return rawMessage;
  }
}

/**
 * Synchronously detect if we're coming from a GameBuddies session
 * This runs before render to avoid homepage flash
 */
function hasGameBuddiesSessionToken(): boolean {
  const params = new URLSearchParams(window.location.search);
  return !!(params.get('session') || params.get('room') || params.get('gbRoomCode'));
}

// ========================================
// LAZY-LOADED COMPONENTS (Code Splitting)
// Heavy components loaded on-demand for better initial load performance
// Note: LobbyComponent and GameComponent use direct imports for reliability
// ========================================
const SettingsModal = lazy(() => import('./components/SettingsModalNoir').then(m => ({ default: m.SettingsModal })));

// ========================================
// LOADING FALLBACK COMPONENTS (Skeletons)
// ========================================

const SettingsSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-12 bg-slate-700/50 rounded-lg" />
    ))}
  </div>
);

/**
 * VideoHooksManager - Activates video-related hooks (P-key shortcut, preferences).
 * Must be inside WebRTCProvider and VideoUIProvider.
 */
function VideoHooksManager() {
  useVideoKeyboardShortcuts();
  useVideoPreferences();
  return null;
}

/**
 * VideoSettingsManager - Renders device settings modal for video setup/edit.
 * Must be inside WebRTCProvider and VideoUIProvider.
 */
function VideoSettingsManager() {
  const { isVideoPrepairing, confirmVideoChat, cancelVideoPreparation } = useWebRTC();
  const { isSettingsOpen, closeSettings } = useVideoUI();

  const isOpen = isVideoPrepairing || isSettingsOpen;
  const mode = isVideoPrepairing ? 'setup' : 'edit';

  const handleClose = () => {
    if (isVideoPrepairing) {
      cancelVideoPreparation();
    } else {
      closeSettings();
    }
  };

  const handleConfirm = () => {
    if (isVideoPrepairing) {
      confirmVideoChat();
    } else {
      closeSettings();
    }
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

function AppContent() {
  const mobileNav = useMobileNavigation();

  // Force re-render when language changes (no page reload needed)
  const [, setLangVersion] = useState(0);
  useEffect(() => {
    const onLangChange = () => setLangVersion(v => v + 1);
    window.addEventListener('languagechange', onLangChange);
    return () => window.removeEventListener('languagechange', onLangChange);
  }, []);

  // Detect GameBuddies launch synchronously (memoized to run once)
  const isLoadingFromGameBuddies = useMemo(() => hasGameBuddiesSessionToken(), []);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [restoreInfo, setRestoreInfo] = useState<{ phase: string; connectedCount: number; totalPlayers: number } | null>(null);

  useEffect(() => { initAnalytics(); initErrorReporter(); }, []);

  // Safety timeout: force-resolve loading state after 10s to prevent infinite LoadingScreen
  useEffect(() => {
    if (!isLoadingFromGameBuddies || loadingTimedOut) return;
    const timeout = setTimeout(() => {
      console.warn('[App] Session resolution timeout — forcing resolved');
      setLoadingTimedOut(true);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [isLoadingFromGameBuddies, loadingTimedOut]);

  const registerGameEvents = useCallback(
    (socket: Socket, helpers: RegisterGameEventsHelpers) => {
      const handleRoomStateUpdated = (updatedLobby: Lobby) => {
        console.log('[handleRoomStateUpdated] messages count:', updatedLobby.messages?.length,
          'first raw:', updatedLobby.messages?.[0]?.message?.slice(0, 80));
        if (updatedLobby.messages) {
          updatedLobby = {
            ...updatedLobby,
            messages: updatedLobby.messages.map(msg => ({
              ...msg,
              message: translateGameMessage(msg.message),
            })),
          };
          console.log('[handleRoomStateUpdated] first translated:', updatedLobby.messages[0]?.message?.slice(0, 80));
        }
        helpers.setLobbyState(updatedLobby);
      };

      const handleTimerUpdate = (data: { timeRemaining: number }) => {
        helpers.patchLobby((prev) => {
          if (!prev || !prev.gameData) return prev;
          return {
            ...prev,
            gameData: {
              ...prev.gameData,
              timeRemaining: data.timeRemaining,
            },
          };
        });
      };

      const handleGameRestarted = () => {
        helpers.setError('');
      };

      const handleVictory = (data: { matchedWord: string; round: number; timeTaken: number }) => {
        console.log('[Game] Victory', data);
      };

      const handleNoMatch = (data: { player1Word: string; player2Word: string; livesRemaining: number }) => {
        console.log('[Game] No match', data);
      };

      // Game log events from server (translates JSON {key,params} messages)
      const handleGameLog = (data: { message: string }) => {
        console.log('[handleGameLog] raw:', data.message?.slice(0, 80));
        helpers.patchLobby((prev) => {
          if (!prev) return prev;
          const translated = translateGameMessage(data.message);
          console.log('[handleGameLog] translated:', translated?.slice(0, 80));
          const newMessage = {
            id: crypto.randomUUID(),
            playerId: 'system',
            playerName: 'Game',
            message: translated,
            timestamp: Date.now(),
          };
          return {
            ...prev,
            messages: [...(prev.messages || []), newMessage],
          };
        });
      };

      const handleBackToLobby = () => {
        // State transition handled by broadcastRoomState → roomStateUpdated
        console.log('[Game] Back to lobby');
      };

      socket.on('roomStateUpdated', handleRoomStateUpdated);
      socket.on('timer:update', handleTimerUpdate);
      socket.on('game:restarted', handleGameRestarted);
      socket.on('game:victory', handleVictory);
      socket.on('game:no-match', handleNoMatch);
      socket.on('game:log', handleGameLog);
      socket.on('game:backToLobby', handleBackToLobby);

      // Reconnect overlay events
      const onGameRestored = (data: { phase: string; connectedCount: number; totalPlayers: number }) => {
        setRestoreInfo(data);
      };
      const onGameResumed = () => setRestoreInfo(null);
      const onPlayerReconnected = () => {
        setRestoreInfo(prev => prev ? { ...prev, connectedCount: prev.connectedCount + 1 } : null);
      };
      socket.on('game:restored', onGameRestored);
      socket.on('game:resumed', onGameResumed);
      socket.on('player:reconnected', onPlayerReconnected);

      return () => {
        socket.off('roomStateUpdated', handleRoomStateUpdated);
        socket.off('timer:update', handleTimerUpdate);
        socket.off('game:restarted', handleGameRestarted);
        socket.off('game:victory', handleVictory);
        socket.off('game:no-match', handleNoMatch);
        socket.off('game:log', handleGameLog);
        socket.off('game:backToLobby', handleBackToLobby);
        socket.off('game:restored', onGameRestored);
        socket.off('game:resumed', onGameResumed);
        socket.off('player:reconnected', onPlayerReconnected);
      };
    },
    []
  );

  const {
    lobby,
    messages,
    error,
    isConnected,
    socket,
    gameBuddiesSession,
    kickMessage,
    createRoom,
    joinRoom,
    clearKickMessage,
  } = useGameBuddiesClient({ registerGameEvents });

  // Spectator: allow clicking players in sidebar to view their perspective
  const isSpectator = !!lobby?.players?.find((p: any) => p.socketId === lobby.mySocketId)?.isSpectator;
  const handleSpectatorPlayerClick = useCallback((targetSocketId: string) => {
    if (!isSpectator || !socket) return;
    socket.emit('spectator:view-as', { targetSocketId });
  }, [isSpectator, socket]);

  const renderPage = () => {
    // Show loading screen when coming from GameBuddies but not connected yet
    if (isLoadingFromGameBuddies && !isConnected && !loadingTimedOut) {
      return <LoadingScreen message={getTranslation('app.launchingGame', getCurrentLanguage())} />;
    }

    if (!isConnected) {
      return (
        <div className="container">
          <h1>{getTranslation('app.connecting', getCurrentLanguage())}</h1>
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>
            {getTranslation('app.connectingToServer', getCurrentLanguage())}
          </p>
        </div>
      );
    }

    // Show loading screen when coming from GameBuddies but room not created yet
    // Keep showing until lobby is created (gameBuddiesSession may still be resolving)
    if (isLoadingFromGameBuddies && !lobby && !kickMessage && !loadingTimedOut) {
      console.log('[App] Showing LoadingScreen - waiting for GameBuddies room join');
      return <LoadingScreen message={getTranslation('app.launchingGame', getCurrentLanguage())} />;
    }

    if (!lobby) {
      return (
        <HomePage
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          gameBuddiesSession={gameBuddiesSession}
        />
      );
    }

    return <GamePage lobby={lobby} socket={socket!} />;
  };

  useEffect(() => {
    if (!lobby) {
      backgroundMusic.stop();
      return;
    }

    const shouldPlayMusic =
      lobby.state === 'LOBBY' ||
      lobby.state === 'PLAYING';

    if (shouldPlayMusic) {
      backgroundMusic.play();
    } else if (lobby.state === 'ENDED') {
      backgroundMusic.stop();
    }
  }, [lobby?.state, lobby]);

  useEffect(() => {
    const savedBgMusic = localStorage.getItem('primesuspect-background-music-enabled');
    const bgMusicEnabled = savedBgMusic ? JSON.parse(savedBgMusic) : true;
    backgroundMusic.setEnabled(bgMusicEnabled);

    const savedSfx = localStorage.getItem('primesuspect-sound-effects-enabled');
    const sfxEnabled = savedSfx ? JSON.parse(savedSfx) : true;
    soundEffects.setEnabled(sfxEnabled);

    const savedSfxVolume = localStorage.getItem('primesuspect-volume');
    if (savedSfxVolume) {
      const vol = parseInt(savedSfxVolume, 10);
      soundEffects.setVolume(vol / 100);
    } else {
      soundEffects.setVolume(0.5);
    }

    const savedMusicVolume = localStorage.getItem('primesuspect-music-volume');
    if (savedMusicVolume) {
      const vol = parseInt(savedMusicVolume, 10);
      backgroundMusic.setVolume(vol / 100);
    } else {
      backgroundMusic.setVolume(0.01);
    }
  }, []);

  const webcamConfig = socket && lobby ? createGameAdapter(socket, lobby.code, lobby) : null;

  useEffect(() => {
    const root = document.querySelector('.app-root');
    if (!root) return;
    const stray = root.querySelectorAll(':scope > div[style*="radial-gradient"][style*="z-index: -1"]');
    stray.forEach((node) => node.parentElement?.removeChild(node));
  }, []);

  const rootClass = webcamConfig ? 'app-root in-room has-filmstrip' : 'app-root';

  return (
    <div className={rootClass}>
      <ThemeToggle />
      {webcamConfig ? (
        <WebcamConfigProvider config={webcamConfig}>
          <WebRTCProvider>
            <VideoUIProvider>
              <div className="app-layout">
                {lobby && <GameHeader lobby={lobby} gameBuddiesSession={gameBuddiesSession} />}

                <div className="flex flex-col lg:flex-row flex-1 min-h-0 lg:h-full">
                  <div className="flex-1 p-0 pb-20 lg:pb-0 overflow-y-auto main-scroll-area">
                    {error && (
                      <div className="error-message bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg" style={{ margin: '20px auto', maxWidth: '600px' }}>
                        {error}
                      </div>
                    )}
                    {renderPage()}
                  </div>

                  {lobby && socket && (
                    <div className="hidden lg:flex flex-col right-sidebar">
                      <PlayerList
                        players={lobby.players}
                        hostId={lobby.hostId}
                        mySocketId={lobby.mySocketId}
                        roomCode={lobby.code}
                        socket={socket}
                        isSpectator={isSpectator}
                        viewingAsSocketId={(lobby as any).viewingAs}
                        onPlayerClick={handleSpectatorPlayerClick}
                      />
                      <ChatWindow
                        messages={messages}
                        socket={socket}
                        roomCode={lobby.code}
                        mode="sidebar"
                      />
                    </div>
                  )}
                </div>
              </div>

              {lobby && (
                <BottomTabBar
                  activeTab={mobileNav.activeTab}
                  showHistory={lobby.state !== 'LOBBY'}
                  onTabChange={(tab) => {
                    mobileNav.setActiveTab(tab);
                    if (tab === 'chat') mobileNav.openDrawer('chat');
                    if (tab === 'players') mobileNav.openDrawer('players');
                    if (tab === 'video') mobileNav.openDrawer('video');
                    if (tab === 'settings') mobileNav.openDrawer('settings');
                    if (tab === 'history') mobileNav.openDrawer('history');
                  }}
                />
              )}

              {lobby && mobileNav.isDrawerOpen && socket && (
                <MobileDrawer
                  isOpen={mobileNav.isDrawerOpen}
                  onClose={mobileNav.closeDrawer}
                  position="bottom"
                  className={mobileNav.drawerContent === 'video' ? 'video-drawer-full' : ''}
                  hideHeader={mobileNav.drawerContent === 'video'} // Hide header for video drawer
                  title={
                    mobileNav.drawerContent === 'chat' ? getTranslation('drawer.chat', getCurrentLanguage()) :
                    mobileNav.drawerContent === 'players' ? getTranslation('drawer.players', getCurrentLanguage()) :
                    mobileNav.drawerContent === 'settings' ? getTranslation('drawer.settings', getCurrentLanguage()) :
                    mobileNav.drawerContent === 'history' ? getTranslation('drawer.history', getCurrentLanguage()) : ''
                  }
                >
                  {mobileNav.drawerContent === 'chat' && (
                    <ChatWindow
                      messages={messages}
                      socket={socket}
                      roomCode={lobby.code}
                    />
                  )}
                  {mobileNav.drawerContent === 'players' && (
                    <PlayerList
                      players={lobby.players}
                      hostId={lobby.hostId}
                      mySocketId={lobby.mySocketId}
                      roomCode={lobby.code}
                      socket={socket}
                      isSpectator={isSpectator}
                      viewingAsSocketId={(lobby as any).viewingAs}
                      onPlayerClick={handleSpectatorPlayerClick}
                    />
                  )}
                  {mobileNav.drawerContent === 'video' && (
                    <MobileVideoGrid
                      players={(lobby.players || []).map((p: any) => ({ ...p, id: p.socketId || p.id, name: p.name || p.playerName }))}
                      localPlayerName={lobby.players?.find((p: any) => p.socketId === socket?.id)?.name}
                      mySocketId={socket?.id}
                    />
                  )}
                  {mobileNav.drawerContent === 'settings' && (
                    <Suspense fallback={<SettingsSkeleton />}>
                      <div className="p-4">
                        <SettingsModal onClose={mobileNav.closeDrawer} />
                      </div>
                    </Suspense>
                  )}
                  {mobileNav.drawerContent === 'history' && lobby.gameData && (
                    <div className="p-4">{getTranslation('drawer.historyNotAvailable', getCurrentLanguage())}</div>
                  )}
                </MobileDrawer>
              )}

              <div className="hidden lg:block">
                <VideoFilmstrip
                  players={(lobby?.players || []).map((p: any) => ({ ...p, id: p.socketId || p.id, name: p.name || p.playerName }))}
                  roomCode={lobby?.code}
                  localPlayerName={lobby?.players?.find((p: any) => p.socketId === socket?.id)?.name}
                  teams={[]}
                  mySocketId={socket?.id}
                />
              </div>
              {/* Streamer Broadcast Window - popup for OBS capture */}
              {lobby && socket && (
                <StreamerBroadcastWindow
                  lobby={lobby}
                  players={(lobby.players || []).map((p: any) => ({ ...p, id: p.socketId || p.id, name: p.name || p.playerName }))}
                  localPlayerName={lobby.players?.find((p: any) => p.socketId === socket?.id)?.name}
                  mySocketId={socket?.id}
                  socket={socket}
                />
              )}
              <VideoHooksManager />
              <VideoSettingsManager />
            </VideoUIProvider>
          </WebRTCProvider>
        </WebcamConfigProvider>
      ) : (
        <>
          {error && (
            <div className="error-message bg-orange-500/20 border border-orange-500 text-orange-200 p-4 rounded-lg m-6 max-w-2xl mx-auto">
              {error}
            </div>
          )}
          {renderPage()}
        </>
      )}
      {/* Reconnect overlay - shown when game is restored after server restart */}
      {restoreInfo && (
        <ReconnectOverlay
          phase={restoreInfo.phase}
          connectedCount={restoreInfo.connectedCount}
          totalPlayers={restoreInfo.totalPlayers}
          isHost={!!lobby?.players?.find((p: any) => p.socketId === socket?.id)?.isHost}
          onResume={() => socket?.emit('game:resume')}
        />
      )}
      {/* Kick Toast */}
      <KickToast message={kickMessage} onClose={clearKickMessage} />
    </div>
  );
}

function App() {
  const [siteNotification, setSiteNotification] = useState<SiteNotification | null>(null);

  // Listen for site-wide notifications (retry until socket is available)
  useEffect(() => {
    let handler: ((data: SiteNotification) => void) | null = null;
    const interval = setInterval(() => {
      const s = socketService.getSocket();
      if (s) {
        clearInterval(interval);
        handler = (data: SiteNotification) => setSiteNotification(data);
        s.on('site:notification', handler);
      }
    }, 500);
    return () => {
      clearInterval(interval);
      if (handler) socketService.getSocket()?.off('site:notification', handler);
    };
  }, []);

  return (
    <ThemeProvider>
      <AppContent />
      <InstallPrompt />
      <SiteNotificationToast notification={siteNotification} onClose={() => setSiteNotification(null)} />
    </ThemeProvider>
  );
}

export default App;
