import { useEffect, useCallback, lazy, Suspense } from 'react';
import type { Socket } from 'socket.io-client';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
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
import type { RegisterGameEventsHelpers } from './hooks/useGameBuddiesClient';
import type { Lobby } from './types';
import './unified.css';

// ========================================
// LAZY-LOADED COMPONENTS (Code Splitting)
// Heavy components loaded on-demand for better initial load performance
// Note: LobbyComponent and GameComponent use direct imports for reliability
// ========================================
const VideoEnhancements = lazy(() => import('./components/VideoEnhancements'));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));

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

  const registerGameEvents = useCallback(
    (socket: Socket, helpers: RegisterGameEventsHelpers) => {
      const handleRoomStateUpdated = (updatedLobby: Lobby) => {
        helpers.setLobbyState(updatedLobby);
        if (updatedLobby.messages) {
          helpers.setMessages(updatedLobby.messages);
        }
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

      socket.on('roomStateUpdated', handleRoomStateUpdated);
      socket.on('timer:update', handleTimerUpdate);
      socket.on('game:restarted', handleGameRestarted);
      socket.on('game:victory', handleVictory);
      socket.on('game:no-match', handleNoMatch);

      return () => {
        socket.off('roomStateUpdated', handleRoomStateUpdated);
        socket.off('timer:update', handleTimerUpdate);
        socket.off('game:restarted', handleGameRestarted);
        socket.off('game:victory', handleVictory);
        socket.off('game:no-match', handleNoMatch);
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
    if (!isConnected) {
      return (
        <div className="container">
          <h1>Connecting...</h1>
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>
            Connecting to server...
          </p>
        </div>
      );
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
    const savedBgMusic = localStorage.getItem('heartsgambit-background-music-enabled');
    const bgMusicEnabled = savedBgMusic ? JSON.parse(savedBgMusic) : false;
    backgroundMusic.setEnabled(bgMusicEnabled);

    const savedSfx = localStorage.getItem('heartsgambit-sound-effects-enabled');
    const sfxEnabled = savedSfx ? JSON.parse(savedSfx) : true;
    soundEffects.setEnabled(sfxEnabled);

    const savedVolume = localStorage.getItem('heartsgambit-volume');
    if (savedVolume) {
      const vol = parseInt(savedVolume, 10);
      soundEffects.setVolume(vol / 100);
      backgroundMusic.setVolume(vol / 100);
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
                  <div className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-y-auto main-scroll-area">
                    {error && (
                      <div className="error-message bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg" style={{ margin: '20px auto', maxWidth: '600px' }}>
                        {error}
                      </div>
                    )}
                    {renderPage()}
                  </div>

                  {lobby && socket && (
                    <div className="hidden lg:flex w-full lg:w-96 h-80 lg:h-full flex-col right-sidebar">
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
                  showHistory={lobby.state !== 'LOBBY_WAITING'}
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
                    mobileNav.drawerContent === 'chat' ? 'Chat' :
                    mobileNav.drawerContent === 'players' ? 'Players' :
                    mobileNav.drawerContent === 'settings' ? 'Settings' :
                    mobileNav.drawerContent === 'history' ? 'History' : ''
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
                    <div className="p-4">History not available in Hearts Gambit</div>
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
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
