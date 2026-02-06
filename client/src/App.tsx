import { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import ChatWindow from './components/ChatWindow';
import PlayerList from './components/PlayerList';
import { BottomTabBar } from './components/BottomTabBar';
import { MobileDrawer } from './components/MobileDrawer';
import { useMobileNavigation } from './hooks/useMobileNavigation';
import { WebRTCProvider } from './contexts/WebRTCContext';
import { VideoUIProvider } from './contexts/VideoUIContext';
import { WebcamConfigProvider } from './config/WebcamConfig';
import WebcamDisplay from './components/WebcamDisplay';
import { createGameAdapter } from './adapters/gameAdapter';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import GameHeader from './components/GameHeader';
import VideoFilmstrip from './components/VideoFilmstrip';
import { VideoDrawerContent } from './components/VideoDrawerContent';
import { backgroundMusic } from './utils/backgroundMusic';
import { soundEffects } from './utils/soundEffects';
import { useGameBuddiesClient } from './hooks/useGameBuddiesClient';
import InstallPrompt from './components/InstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import SiteNotificationToast from './components/ui/SiteNotificationToast';
import type { SiteNotification } from './components/ui/SiteNotificationToast';
import socketService from './services/socketService';
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
const VideoEnhancements = lazy(() => import('./components/VideoEnhancements'));
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

function AppContent() {
  const mobileNav = useMobileNavigation();

  // Detect GameBuddies launch synchronously (memoized to run once)
  const isLoadingFromGameBuddies = useMemo(() => hasGameBuddiesSessionToken(), []);

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

      return () => {
        socket.off('roomStateUpdated', handleRoomStateUpdated);
        socket.off('timer:update', handleTimerUpdate);
        socket.off('game:restarted', handleGameRestarted);
        socket.off('game:victory', handleVictory);
        socket.off('game:no-match', handleNoMatch);
        socket.off('game:log', handleGameLog);
        socket.off('game:backToLobby', handleBackToLobby);
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
    createRoom,
    joinRoom,
  } = useGameBuddiesClient({ registerGameEvents });

  const renderPage = () => {
    // Show loading screen when coming from GameBuddies but not connected yet
    if (isLoadingFromGameBuddies && !isConnected) {
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
    if (isLoadingFromGameBuddies && !lobby) {
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
                    />
                  )}
                  {mobileNav.drawerContent === 'video' && (
                    <VideoDrawerContent players={lobby.players} />
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
                <VideoFilmstrip />
              </div>

              <div style={{ display: 'none' }}>
                <WebcamDisplay />
              </div>

              <Suspense fallback={null}>
                <VideoEnhancements />
              </Suspense>
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
    </div>
  );
}

function App() {
  const [siteNotification, setSiteNotification] = useState<SiteNotification | null>(null);

  // Listen for site-wide notifications (retry until socket is available)
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const interval = setInterval(() => {
      const s = socketService.getSocket();
      if (s) {
        clearInterval(interval);
        const handler = (data: SiteNotification) => setSiteNotification(data);
        s.on('site:notification', handler);
        cleanup = () => s.off('site:notification', handler);
      }
    }, 500);
    return () => {
      clearInterval(interval);
      cleanup?.();
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
