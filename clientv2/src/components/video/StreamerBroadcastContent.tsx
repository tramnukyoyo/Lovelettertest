/**
 * Streamer Broadcast Content — Bluffalo
 *
 * Single fixed layout (game stage dominant) following Canvas Chaos / Soundbite pattern.
 * Two modes:
 *   - Setup mode: broadcast preview (left) + settings panel (right)
 *   - Stream mode: fullscreen broadcast + tiny gear icon strip on right edge
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LockOpen, SlidersHorizontal } from 'lucide-react';
import socketService from '../../services/socketService';
import { useWebRTC } from '../../contexts/WebRTCContext';
import PaperDeductionBackdrop from '../ui/decor/PaperDeductionBackdrop';
import StreamerSettingsPanel from './StreamerSettingsPanel';
import StreamerWebcamGrid from './StreamerWebcamGrid';
import StreamerGameStage from './StreamerGameStage';
import { getBroadcastCopy } from './broadcastCopy';
import type { BroadcastOverlays } from './StreamerSettingsPanel';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import type { Lobby } from '../../types';
import { GAME_META } from '../../config/gameMeta';
import '../../styles/streamer.css';
import '../../styles/bluffalo-streamer.css';

const LS_OVERLAYS_KEY = 'bluffalo-broadcast-overlays';
const SETTINGS_PANEL_WIDTH = 248;

const DEFAULT_OVERLAYS: BroadcastOverlays = {
  timer: true,
  playerNames: true,
  phaseBadge: true,
  roomCode: false,
  chatTicker: false,
};

function loadSettings(): { overlays: BroadcastOverlays; isStreamerMode: boolean } {
  let overlays = { ...DEFAULT_OVERLAYS };
  const isStreamerMode = localStorage.getItem('bluffalo-streamer-mode') === 'true';

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

function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTimerTone(seconds: number): string {
  if (seconds <= 0) return 'is-idle';
  if (seconds <= 10) return 'is-critical';
  if (seconds <= 30) return 'is-warning';
  return 'is-live';
}

function formatPhaseLabel(phase: string, copy: ReturnType<typeof getBroadcastCopy>): string {
  const labels: Record<string, string> = {
    'lobby': copy.phaseLabels.lobby,
    'question_display': copy.phaseLabels.questionDisplay,
    'lie_input': copy.phaseLabels.lieInput,
    'voting': copy.phaseLabels.voting,
    'reveal': copy.phaseLabels.reveal,
    'scores': copy.phaseLabels.scores,
    'game_over': copy.phaseLabels.gameOver,
  };
  return labels[phase] || phase.toUpperCase();
}

function getPhaseToneClass(phase: string): string {
  const tones: Record<string, string> = {
    'lobby': 'phase-lobby',
    'question_display': 'phase-prompts',
    'lie_input': 'phase-prompts',
    'voting': 'phase-voting',
    'reveal': 'phase-reveal',
    'scores': 'phase-results',
    'game_over': 'phase-ended',
  };
  return tones[phase] || 'phase-lobby';
}

function getStatusText(phase: string, copy: ReturnType<typeof getBroadcastCopy>): string {
  if (phase === 'LOBBY') return '';
  if (phase === 'question_display') return copy.content.questionInProgress;
  if (phase === 'lie_input') return copy.content.writingBluffs;
  if (phase === 'voting') return copy.content.votingLive;
  if (phase === 'reveal') return copy.content.revealAnswers;
  if (phase === 'scores') return copy.content.scoresUpdate;
  if (phase === 'game_over') return copy.content.gameOver;
  return '';
}

interface StreamerBroadcastContentProps {
  lobby: Lobby;
  players: WebcamPlayer[];
  localPlayerName?: string;
  mySocketId?: string;
  onClose: () => void;
}

const StreamerBroadcastContent: React.FC<StreamerBroadcastContentProps> = ({
  lobby,
  players,
  localPlayerName,
  mySocketId,
  onClose,
}) => {
  const copy = getBroadcastCopy();
  const { overlays: savedOverlays } = loadSettings();
  const { localStream, remoteStreams } = useWebRTC();
  const [overlays, setOverlays] = useState<BroadcastOverlays>(savedOverlays);
  const [isLocked, setIsLocked] = useState(false);
  const [showGear, setShowGear] = useState(false);

  // 3-2-1-GO! game-start countdown. Non-host clients receive the server relay
  // (game:countdown); the host's own ticks arrive via the window bridge that
  // LobbyPage dispatches (the server doesn't echo to the sender).
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const goTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleTick = (value: number) => {
      if (typeof value !== 'number') return;
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
      setStartCountdown(value);
      if (value === 0) {
        goTimerRef.current = setTimeout(() => setStartCountdown(null), 800);
      }
    };
    const onSocket = (data: { countdown: number }) => handleTick(data?.countdown);
    const onWindow = (e: Event) => handleTick((e as CustomEvent).detail?.countdown);
    const socket = socketService.getSocket();
    socket?.on('game:countdown', onSocket);
    window.addEventListener('bluffalo:countdown', onWindow);
    return () => {
      socket?.off('game:countdown', onSocket);
      window.removeEventListener('bluffalo:countdown', onWindow);
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
    };
  }, []);

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

  const gameData = lobby.gameData;
  const phase = lobby.state || 'LOBBY';
  const isLobbyPhase = phase === 'LOBBY';
  const timeRemaining = gameData?.timeRemaining ?? 0;
  const connectedPlayers = lobby.players.filter(p => p.connected).length;
  const connectedCams = (localStream ? 1 : 0) + players.filter(p => remoteStreams.has(p.id)).length;

  const phaseLabel = formatPhaseLabel(phase, copy);
  const phaseToneClass = getPhaseToneClass(phase);
  const statusText = getStatusText(phase, copy);

  const currentRound = gameData?.currentRound ?? 0;
  const totalRounds = gameData?.totalRounds ?? 0;
  const roundLabel = currentRound > 0
    ? `${copy.content.roundLabel} ${currentRound}${totalRounds > 0 ? '/' + totalRounds : ''}`
    : `${copy.content.roundLabel} 1`;

  const hasAnyVideoTile = Boolean(localPlayerName || mySocketId) || players.length > 0;
  const showGameplayHud = !isLobbyPhase;
  const showWebcamStrip = hasAnyVideoTile && !isLobbyPhase;

  const broadcastGrid = (
    <div className="streamer-broadcast-area streamer-layout-grid-only">
      {/* Single compact top bar: brand left, pills/status right — the old
          separate HUD row cost ~50px of the 720p canvas. */}
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
        <div className="streamer-broadcast-header-group">
          {showGameplayHud && statusText && (
            <span className="streamer-broadcast-status-text">{statusText}</span>
          )}
          {showGameplayHud && (
            <div className="streamer-broadcast-pills">
              <span className="streamer-hud-pill round">{roundLabel}</span>
              {overlays.phaseBadge && (
                <span className={`streamer-hud-pill phase ${phaseToneClass}`}>
                  {phaseLabel}
                </span>
              )}
              {overlays.timer && timeRemaining > 0 && (
                <span className={`streamer-hud-pill timer ${getTimerTone(timeRemaining)}`}>
                  {formatTimer(timeRemaining)}
                </span>
              )}
            </div>
          )}
          {overlays.roomCode && !lobby.isStreamerMode && (
            <span className="streamer-room-code">#{lobby.code}</span>
          )}
          {isLobbyPhase && (
            <span className="streamer-lobby-status">
              <span className="streamer-lobby-status-dot" />
              {copy.content.waitingForGameToStart}
            </span>
          )}
        </div>
      </div>

      <div className="streamer-grid-stage">
        {startCountdown !== null && (
          <div className="streamer-countdown-overlay">
            <span className="streamer-countdown-badge" key={startCountdown}>
              {startCountdown === 0 ? copy.content.go : startCountdown}
            </span>
          </div>
        )}
        {isLobbyPhase ? (
          connectedCams === 0 ? (
            <div className="streamer-lobby-waiting">
              <img
                src={`${import.meta.env.BASE_URL}mascot.webp`}
                alt={GAME_META.mascotAlt}
                className="streamer-lobby-waiting-mascot"
              />
              <div className="streamer-lobby-waiting-title">{copy.content.waitingForGameToStart}</div>
              {!lobby.isStreamerMode && (
                <div className="streamer-lobby-waiting-code">#{lobby.code}</div>
              )}
            </div>
          ) : (
            <StreamerWebcamGrid
              players={players}
              localPlayerName={localPlayerName}
              mySocketId={mySocketId}
              overlays={overlays}
            />
          )
        ) : showWebcamStrip ? (
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <StreamerGameStage lobby={lobby} overlays={overlays} />
            </div>
            <div style={{ width: '25%', minWidth: '140px', maxWidth: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <StreamerWebcamGrid
                players={players}
                localPlayerName={localPlayerName}
                mySocketId={mySocketId}
                overlays={overlays}
                strip
              />
            </div>
          </div>
        ) : (
          <StreamerGameStage lobby={lobby} overlays={overlays} />
        )}
      </div>
    </div>
  );

  if (isLocked) {
    return (
      <div className="streamer-broadcast-root stream-mode bluffalo-broadcast">
        <PaperDeductionBackdrop />
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
    <div className="streamer-broadcast-root setup-mode bluffalo-broadcast">
      <PaperDeductionBackdrop />
      <div className="streamer-broadcast-preview">
        <div className="streamer-preview-label">
          BLUFFALO
          <span className="streamer-preview-tag">{copy.content.previewLabel}</span>
        </div>
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
