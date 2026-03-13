/**
 * Streamer Broadcast Content - Prime Suspect
 *
 * Single fixed layout (game stage dominant) following Canvas Chaos / DDF pattern.
 * Two modes:
 *   - Setup mode: broadcast preview (left) + settings panel (right)
 *   - Stream mode: fullscreen broadcast + tiny gear icon strip on right edge
 */

import React, { useCallback, useEffect, useState } from 'react';
import { LockOpen, SlidersHorizontal } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useWebRTC } from '../../contexts/WebRTCContext';
import StreamerSettingsPanel from './StreamerSettingsPanel';
import StreamerWebcamGrid from './StreamerWebcamGrid';
import StreamerGameStage from './StreamerGameStage';
import { getBroadcastCopy } from './broadcastCopy';
import type { BroadcastOverlays } from './StreamerSettingsPanel';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import type { Lobby } from '../../types';
import { GAME_META } from '../../config/gameMeta';
import '../../styles/streamer.css';

const LS_OVERLAYS_KEY = 'gb-broadcast-overlays';
const SETTINGS_PANEL_WIDTH = 248;

const DEFAULT_OVERLAYS: BroadcastOverlays = {
  timer: true,
  playerNames: true,
  phaseBadge: true,
  roomCode: false,
  chatTicker: false,
};

type BroadcastGameData = {
  currentRound?: number;
  currentTurn?: string;
  roundWinner?: string | null;
  turnPhase?: string;
  winner?: string;
} | null | undefined;

function loadSettings(): { overlays: BroadcastOverlays; isStreamerMode: boolean } {
  let overlays = { ...DEFAULT_OVERLAYS };
  const isStreamerMode = localStorage.getItem('gamebuddies-streamer-mode') === 'true';

  try {
    const savedOverlays = localStorage.getItem(LS_OVERLAYS_KEY);
    if (savedOverlays) {
      overlays = { ...DEFAULT_OVERLAYS, ...JSON.parse(savedOverlays) };
      if (isStreamerMode && !savedOverlays.includes('"roomCode"')) {
        overlays.roomCode = false;
      }
    } else if (isStreamerMode) {
      overlays.roomCode = false;
    }
  } catch {
    // Ignore invalid saved overlays
  }

  overlays.timer = true;
  overlays.phaseBadge = true;

  return { overlays, isStreamerMode };
}

function formatPhaseLabel(
  state: string,
  copy: ReturnType<typeof getBroadcastCopy>,
  gameData?: BroadcastGameData
): string {
  if (state === 'LOBBY') return copy.phaseLabels.waiting;
  if (state === 'ENDED') return copy.phaseLabels.gameOver;
  if (state === 'PLAYING' && gameData) {
    if (gameData.roundWinner) return copy.phaseLabels.roundOver;
    if (gameData.turnPhase === 'draw') return copy.phaseLabels.drawing;
    return copy.phaseLabels.playingCard;
  }
  return state.toUpperCase();
}

function getPhaseToneClass(state: string, gameData?: BroadcastGameData): string {
  if (state === 'LOBBY') return 'phase-lobby';
  if (state === 'ENDED') return 'phase-ended';
  if (state === 'PLAYING' && gameData) {
    if (gameData.roundWinner) return 'phase-round-over';
    if (gameData.turnPhase === 'draw') return 'phase-drawing';
    return 'phase-playing-card';
  }
  return 'phase-lobby';
}

interface StreamerBroadcastContentProps {
  lobby: Lobby;
  players: WebcamPlayer[];
  localPlayerName?: string;
  mySocketId?: string;
  socket: Socket;
  onClose: () => void;
}

const StreamerBroadcastContent: React.FC<StreamerBroadcastContentProps> = ({
  lobby,
  players,
  localPlayerName,
  mySocketId,
  socket,
  onClose,
}) => {
  const copy = getBroadcastCopy();
  const { overlays: savedOverlays } = loadSettings();
  const { localStream, remoteStreams } = useWebRTC();
  const [overlays, setOverlays] = useState<BroadcastOverlays>(savedOverlays);
  const [isLocked, setIsLocked] = useState(false);
  const [showGear, setShowGear] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_OVERLAYS_KEY, JSON.stringify(overlays));
  }, [overlays]);

  const handleLock = useCallback(() => {
    setIsLocked(true);
    setShowGear(false);
  }, []);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    setShowGear(false);
  }, []);

  const gameData = lobby.gameData as BroadcastGameData;
  const state = lobby.state || 'LOBBY';
  const connectedPlayers = lobby.players.filter(player => player.connected).length;
  const connectedCams = (localStream ? 1 : 0) + players.filter(player => remoteStreams.has(player.id)).length;
  const hasLiveMirror = Boolean(lobby.gameData);

  const phaseLabel = formatPhaseLabel(state, copy, gameData);
  const phaseToneClass = getPhaseToneClass(state, gameData);
  const roundLabel = gameData && typeof gameData.currentRound === 'number' && gameData.currentRound > 0
    ? `${copy.content.roundPrefix} ${gameData.currentRound}`
    : `${copy.content.roundPrefix} 1`;
  const showGameplayHud = !hasLiveMirror && Boolean(gameData && state !== 'LOBBY');
  const showWebcamStrip = state !== 'LOBBY';

  const broadcastGrid = (
    <div className="streamer-broadcast-area streamer-layout-grid-only">
      <div className="streamer-broadcast-header branded">
        <div className="streamer-broadcast-branding">
          <img
            src={`${import.meta.env.BASE_URL}mascot.webp`}
            alt={GAME_META.mascotAlt}
            className="streamer-broadcast-mascot"
          />
          <div className="streamer-broadcast-brandcopy">
            <div className="streamer-broadcast-title">
              {GAME_META.namePrefix}<span className="streamer-broadcast-title-accent">{GAME_META.nameAccent}</span>
            </div>
            <div className="streamer-broadcast-subbrand">
              <span className="brand-game">Game</span>
              <span className="brand-buddies">Buddies</span>
              <span className="brand-io">.io</span>
            </div>
          </div>
        </div>
        {overlays.roomCode && !lobby.isStreamerMode && (
          <span className="streamer-room-code">#{lobby.code}</span>
        )}
        {state === 'LOBBY' && (
          <span className="streamer-lobby-status">
            <span className="streamer-lobby-status-dot" />
            {copy.content.waitingForGameToStart}
          </span>
        )}
      </div>

      {showGameplayHud && (
        <div className="streamer-broadcast-hud">
          <div className="streamer-broadcast-pills">
            <span className="streamer-hud-pill round">{roundLabel}</span>
            {overlays.phaseBadge && (
              <span className={`streamer-hud-pill phase ${phaseToneClass}`}>
                {phaseLabel}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="streamer-grid-stage">
        {showWebcamStrip ? (
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <StreamerGameStage lobby={lobby} overlays={overlays} socket={socket} />
            </div>
            <div style={{ width: '20%', minWidth: '132px', maxWidth: '232px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <StreamerWebcamGrid
                players={players}
                localPlayerName={localPlayerName}
                mySocketId={mySocketId}
                overlays={overlays}
                layout="sidebar"
              />
            </div>
          </div>
        ) : (
          <StreamerWebcamGrid
            players={players}
            localPlayerName={localPlayerName}
            mySocketId={mySocketId}
            overlays={overlays}
          />
        )}
      </div>
    </div>
  );

  if (isLocked) {
    return (
      <div className="streamer-broadcast-root stream-mode ps-broadcast">
        <div className="streamer-broadcast-main">{broadcastGrid}</div>
        <div
          className="streamer-gear-strip"
          onClick={() => setShowGear(prev => !prev)}
          title={copy.content.openBroadcastControls}
        >
          {showGear ? (
            <div className="streamer-gear-menu" onClick={event => event.stopPropagation()}>
              <button
                type="button"
                className="streamer-gear-menu-btn"
                onClick={event => {
                  event.stopPropagation();
                  handleUnlock();
                }}
              >
                <LockOpen className="w-4 h-4" />
                <span>{copy.content.unlock}</span>
              </button>
            </div>
          ) : (
            <span className="streamer-gear-icon">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="streamer-broadcast-root setup-mode ps-broadcast">
      <div className="streamer-broadcast-preview">
        <div className="streamer-preview-label">PRIME SUSPECT</div>
        {broadcastGrid}
      </div>

      <div className="streamer-settings-panel-container" style={{ width: SETTINGS_PANEL_WIDTH }}>
        <StreamerSettingsPanel
          overlays={overlays}
          onOverlaysChange={setOverlays}
          onLock={handleLock}
          onClose={onClose}
          summary={{
            phaseLabel,
            connectedCams,
            connectedPlayers,
            roomCode: lobby.code,
            streamerMode: lobby.isStreamerMode ?? false,
          }}
        />
      </div>
    </div>
  );
};

export default StreamerBroadcastContent;
