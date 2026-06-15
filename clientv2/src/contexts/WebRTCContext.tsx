/**
 * WebRTC Context
 *
 * Manages WebRTC peer connections for video chat functionality.
 * Built on simple-peer (battle-tested glare/ICE/renegotiation handling).
 * Active speaker detection via hark.
 * Signaling stays on the existing webrtc:offer/answer/ice-candidate Socket.IO events.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import hark from 'hark';
import {
  getICEServers,
  prefetchTurnCredentials,
  setMaxVideoBitrate,
  getVideoConstraints,
  getAudioConstraints,
  setH264CodecPreference,
  addEnhancedDiagnostics
} from '../utils/webrtcMobileFixes';
// Heavy effect services (MediaPipe / three.js) are loaded via dynamic import()
// only when a user actually enables the effect — type-only imports here are
// erased at build time and keep them out of the initial bundle.
import type { VirtualBackgroundService } from '../services/virtualBackgroundService';
import type { FaceAvatarService, FaceAvatarConfig } from '../services/faceAvatarService';
import { DEFAULT_VIRTUAL_BACKGROUND_CONFIG, DEFAULT_AVATAR_CONFIG } from '../services/videoEffectsConfig';
import { NoiseSuppressionService } from '../services/noiseSuppressionService';
import RemoteAudioSinks from '../components/video/RemoteAudioSinks';

// ============================================================================
// Debug logging
// ============================================================================

// Peer/track/mute lifecycle logs fire constantly during video chat. Platform
// policy keeps console available in production builds, so gate the chatty
// ones: always on in dev, opt-in in prod via localStorage.gb_rtcDebug = '1'.
const RTC_DEBUG = import.meta.env.DEV ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('gb_rtcDebug') === '1');
const rtcLog = (...args: unknown[]): void => {
  if (RTC_DEBUG) console.log(...args);
};

// ============================================================================
// Types
// ============================================================================

export interface PeerStream {
  peerId: string;
  stream: MediaStream;
}

// Connection quality for a remote peer's inbound feed, derived from getStats().
export type PeerQuality = 'good' | 'ok' | 'poor';

export interface WebRTCContextState {
  // Local stream
  localStream: MediaStream | null;
  isVideoChatActive: boolean;
  isCameraEnabled: boolean;
  isAudioEnabled: boolean;

  // Legacy alias (same as isVideoChatActive)
  isVideoEnabled: boolean;

  // Remote streams
  remoteStreams: Map<string, MediaStream>;

  // Per-peer "tabbed out" state, keyed by socket id. true = peer's
  // document.hidden is currently true (they tabbed out / minimised).
  peerHiddenMap: Map<string, boolean>;

  // Active speakers (peer IDs currently producing audio above the threshold)
  // Includes own socket id when local mic is hot.
  speakingPeers: Set<string>;
  // Convenience: true while the local mic is producing speech.
  isLocalSpeaking: boolean;

  // Peers that have enabled video and are mid-negotiation — we know about
  // them but their remote stream hasn't arrived yet. Drives a "connecting…"
  // tile so a joining player is visible immediately instead of popping in.
  connectingPeers: Set<string>;

  // Per-peer inbound connection quality (good/ok/poor) from getStats polling.
  // Drives the signal-bars badge on each remote tile.
  peerQuality: Map<string, PeerQuality>;

  // Per-peer local audio volume (0..1) and locally-muted set. Purely local —
  // these never touch signaling. The dedicated audio sink reads them.
  peerVolume: Map<string, number>;
  locallyMutedPeers: Set<string>;
  setPeerVolume: (peerId: string, volume: number) => void;
  toggleLocalMute: (peerId: string) => void;

  // Floating webcam reactions, keyed by peer id ('local' for self). Sent over
  // the simple-peer data channel; auto-expire after a few seconds.
  peerReactions: Map<string, { emoji: string; key: number }>;
  sendReaction: (emoji: string) => void;

  // Push-to-talk: when enabled the mic stays muted until the user holds the
  // PTT key (Space). isPushToTalkActive reflects the held state for UI.
  pttEnabled: boolean;
  setPttEnabled: (enabled: boolean) => void;
  isPushToTalkActive: boolean;

  // Controls
  startMedia: () => Promise<void>;
  stopMedia: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;

  // Two-stage video join flow
  isVideoPrepairing: boolean;
  prepareVideoChat: () => Promise<void>;
  confirmVideoChat: () => void;
  cancelVideoPreparation: () => void;
  disableVideoChat: () => void;

  // Connection state
  isConnecting: boolean;
  connectionError: string | null;

  // Device selection
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  setSelectedCamera: (deviceId: string) => Promise<void>;
  setSelectedMicrophone: (deviceId: string) => Promise<void>;
  availableDevices: MediaDeviceInfo[];
  refreshDevices: () => Promise<void>;

  // Mid-session re-apply: read latest localStorage settings, rebuild the
  // processed local stream, and replaceTrack on every connected peer so
  // the change is visible without rejoining.
  applyFaceAvatarFromSettings: () => Promise<void>;
  applyVirtualBgFromSettings: () => Promise<void>;
  applyNoiseSuppressionFromSettings: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const WebRTCContext = createContext<WebRTCContextState | undefined>(undefined);

export const useWebRTC = (): WebRTCContextState => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

// ============================================================================
// Provider Props
// ============================================================================

interface WebRTCProviderProps {
  socket: Socket | null;
  roomCode: string | null;
  children: React.ReactNode;
}

// hark sensitivity. -65dB picks up normal speech without triggering on keyboard taps.
const HARK_THRESHOLD = -65;
const HARK_INTERVAL = 100;

// Per-peer video upload cap. 350 kbps gives a watchable feed while keeping
// TURN-relayed legs well under 1 Mbps total per direction (audio + video).
// Without this Chrome happily pushes 1.5–2 Mbps which murders TURN budgets.
// This is the *baseline* applied on connect; the adaptive poller then floats
// it between MIN and HIGH based on receiver-reported loss/RTT and peer count.
const MAX_VIDEO_KBPS = 350;
const MIN_VIDEO_KBPS = 150;   // floor when the network is struggling
const MAX_VIDEO_KBPS_HIGH = 600; // ceiling when healthy and the room is small

// How often to poll getStats() for quality + adaptive bitrate.
const STATS_INTERVAL_MS = 3000;

// ============================================================================
// Provider
// ============================================================================

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({
  socket,
  roomCode,
  children
}) => {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoChatActive, setIsVideoChatActive] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoPrepairing, setIsVideoPrepairing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  // Per-peer "tabbed out" state, broadcast over the simple-peer data channel
  // when a peer's local document.visibilityState changes. We can't reliably
  // detect this on the receiver via the WebRTC track API in Chromium
  // (track.muted doesn't fire when sender does track.enabled=false), so
  // peers explicitly tell each other.
  const [peerHiddenMap, setPeerHiddenMap] = useState<Map<string, boolean>>(new Map());
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  // Peers mid-negotiation (enabled video, stream not yet received).
  const [connectingPeers, setConnectingPeers] = useState<Set<string>>(new Set());
  // Per-peer inbound quality from getStats polling.
  const [peerQuality, setPeerQuality] = useState<Map<string, PeerQuality>>(new Map());
  // Per-peer local volume + local-mute. The audio sink reads these; the tile
  // controls write them. Purely local, session-scoped (keyed by socket id, so
  // persistence across reconnects would be meaningless).
  const [peerVolume, setPeerVolumeState] = useState<Map<string, number>>(new Map());
  const [locallyMutedPeers, setLocallyMutedPeersState] = useState<Set<string>>(new Set());
  // Floating webcam reactions.
  const [peerReactions, setPeerReactions] = useState<Map<string, { emoji: string; key: number }>>(new Map());
  // Push-to-talk.
  const [pttEnabled, setPttEnabledState] = useState<boolean>(() => localStorage.getItem('pttEnabled') === 'true');
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);

  // Refs
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const harksRef = useRef<Map<string, hark.Harker>>(new Map());
  const localHarkRef = useRef<hark.Harker | null>(null);
  const virtualBgServiceRef = useRef<VirtualBackgroundService | null>(null);
  const faceAvatarServiceRef = useRef<FaceAvatarService | null>(null);
  const noiseSuppressionServiceRef = useRef<NoiseSuppressionService | null>(null);
  // Reaction bookkeeping: monotonic key (to retrigger the float animation) and
  // per-peer expiry timers.
  const reactionKeyRef = useRef(0);
  const reactionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  // Peers we know are in video chat (so we can connect once we have our local stream)
  const videoPeersRef = useRef<Set<string>>(new Set());
  // Currently-applied per-peer upload bitrate cap (kbps). Adaptive poller
  // adjusts this between MIN and MAX based on receiver-reported loss/RTT.
  const appliedBitrateRef = useRef<number>(MAX_VIDEO_KBPS);

  // ============================================================================
  // Speaking detection helpers
  // ============================================================================

  const removeSpeaker = useCallback((id: string) => {
    setSpeakingPeers(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const addSpeaker = useCallback((id: string) => {
    setSpeakingPeers(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const addConnecting = useCallback((id: string) => {
    setConnectingPeers(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const removeConnecting = useCallback((id: string) => {
    setConnectingPeers(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ============================================================================
  // Per-peer local audio controls (volume / local-mute) — purely local
  // ============================================================================

  const setPeerVolume = useCallback((peerId: string, volume: number) => {
    setPeerVolumeState(prev => {
      const next = new Map(prev);
      next.set(peerId, Math.max(0, Math.min(1, volume)));
      return next;
    });
  }, []);

  const toggleLocalMute = useCallback((peerId: string) => {
    setLocallyMutedPeersState(prev => {
      const next = new Set(prev);
      if (next.has(peerId)) next.delete(peerId); else next.add(peerId);
      return next;
    });
  }, []);

  // Enable/disable the local mic tracks (used by push-to-talk and manual mute).
  const setMicEnabled = useCallback((enabled: boolean) => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach(t => { t.enabled = enabled; });
    setIsAudioEnabled(enabled);
  }, []);

  // ============================================================================
  // Reactions (floating emoji over a tile, broadcast over the data channel)
  // ============================================================================

  const showReaction = useCallback((peerId: string, emoji: string) => {
    const key = ++reactionKeyRef.current;
    setPeerReactions(prev => {
      const next = new Map(prev);
      next.set(peerId, { emoji, key });
      return next;
    });
    const existing = reactionTimersRef.current.get(peerId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setPeerReactions(prev => {
        if (!prev.has(peerId)) return prev;
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
      reactionTimersRef.current.delete(peerId);
    }, 4000);
    reactionTimersRef.current.set(peerId, timer);
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    showReaction('local', emoji);
    peersRef.current.forEach((peer) => {
      if (peer.destroyed) return;
      try { peer.send(JSON.stringify({ type: 'reaction', emoji })); } catch { /* data channel not open */ }
    });
  }, [showReaction]);

  const setPttEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem('pttEnabled', String(enabled));
    setPttEnabledState(enabled);
  }, []);

  // ============================================================================
  // Noise suppression — replace any prior NS service, then (if enabled +
  // supported) route the stream's audio through RNNoise, returning a stream
  // with a cleaned audio track + the original video tracks. Falls back to the
  // input stream on any failure so it can never break joining a call.
  // ============================================================================

  const applyNoiseSuppression = useCallback(async (stream: MediaStream): Promise<MediaStream> => {
    if (noiseSuppressionServiceRef.current) {
      try { noiseSuppressionServiceRef.current.dispose(); } catch { /* noop */ }
      noiseSuppressionServiceRef.current = null;
    }
    const enabled = localStorage.getItem('noiseSuppressionEnabled') === 'true';
    if (!enabled || !NoiseSuppressionService.isSupported() || !stream.getAudioTracks().length) {
      return stream;
    }
    try {
      const svc = new NoiseSuppressionService();
      const out = await svc.process(stream);
      noiseSuppressionServiceRef.current = svc;
      rtcLog('[Video/ns] RNNoise applied');
      return out;
    } catch (err) {
      console.warn('[Video/ns] RNNoise failed — using raw audio:', err);
      return stream;
    }
  }, []);

  const stopRemoteHark = useCallback((peerId: string) => {
    const speech = harksRef.current.get(peerId);
    if (speech) {
      try { speech.stop(); } catch { /* noop */ }
      harksRef.current.delete(peerId);
    }
    removeSpeaker(peerId);
  }, [removeSpeaker]);

  const attachRemoteHark = useCallback((peerId: string, stream: MediaStream) => {
    if (!stream.getAudioTracks().length) return;
    stopRemoteHark(peerId);
    try {
      const speech = hark(stream, { interval: HARK_INTERVAL, threshold: HARK_THRESHOLD, play: false });
      speech.on('speaking', () => addSpeaker(peerId));
      speech.on('stopped_speaking', () => removeSpeaker(peerId));
      harksRef.current.set(peerId, speech);
    } catch (err) {
      console.error(`[Video/webrtc] Failed to attach hark for ${peerId}:`, err);
    }
  }, [addSpeaker, removeSpeaker, stopRemoteHark]);

  // ============================================================================
  // Peer lifecycle
  // ============================================================================

  const cleanupPeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      try { peer.destroy(); } catch { /* noop */ }
      peersRef.current.delete(peerId);
    }
    stopRemoteHark(peerId);
    removeConnecting(peerId);
    setPeerQuality(prev => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    setRemoteStreams(prev => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    setPeerHiddenMap(prev => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, [stopRemoteHark, removeConnecting]);

  const createPeer = useCallback((peerId: string, initiator: boolean): SimplePeer.Instance | null => {
    if (!localStreamRef.current || !socket) {
      console.warn(`[Video/webrtc] Cannot create peer ${peerId} — missing local stream or socket`);
      return null;
    }

    rtcLog(`[Video/webrtc] Creating peer ${peerId} (initiator=${initiator})`);

    // Show a "connecting…" tile until this peer's media actually arrives.
    addConnecting(peerId);

    const peer = new SimplePeer({
      initiator,
      stream: localStreamRef.current,
      trickle: true,
      config: {
        iceServers: getICEServers(),
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      }
    });

    // Apply mobile-specific tweaks on the underlying RTCPeerConnection.
    // simple-peer keeps the RTCPeerConnection on `_pc` but the public types omit it.
    const pc = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
    if (pc) {
      setH264CodecPreference(pc, peerId);
      addEnhancedDiagnostics(pc, peerId);
      pc.addEventListener('connectionstatechange', () => {
        rtcLog(`[Video/peer] ${peerId.slice(0,6)} connectionState=${pc.connectionState}`);
      });
      pc.addEventListener('iceconnectionstatechange', () => {
        rtcLog(`[Video/peer] ${peerId.slice(0,6)} iceConnectionState=${pc.iceConnectionState}`);
      });
    }

    peer.on('signal', (signal: SimplePeer.SignalData) => {
      if (!socket || !roomCode) return;

      if (signal.type === 'offer') {
        socket.emit('webrtc:offer', { roomCode, toPeerId: peerId, offer: signal });
      } else if (signal.type === 'answer') {
        socket.emit('webrtc:answer', { roomCode, toPeerId: peerId, answer: signal });
      } else if ('candidate' in signal && signal.candidate) {
        socket.emit('webrtc:ice-candidate', { roomCode, toPeerId: peerId, candidate: signal.candidate });
      }
      // simple-peer also emits {renegotiate:true} / {transceiverRequest:...} on its own
      // signal channel; both flow through the same offer/answer round-trips, so the
      // type==='offer' branch above re-publishes them.
    });

    peer.on('stream', (stream: MediaStream) => {
      rtcLog(`[Video/webrtc] Received remote stream from ${peerId}`);
      removeConnecting(peerId);
      setRemoteStreams(prev => new Map(prev).set(peerId, stream));
      attachRemoteHark(peerId, stream);
    });

    peer.on('track', (_track: MediaStreamTrack, stream: MediaStream) => {
      // Some browsers fire 'track' without a follow-up 'stream'. Re-attach hark
      // so newly added audio tracks are picked up.
      attachRemoteHark(peerId, stream);
    });

    // Visibility / "away" signalling over the data channel. Peers send a
    // small JSON message when they tab out / back so we can show the avatar
    // placeholder with a label instead of the black frames Chromium pumps
    // through when track.enabled is false.
    peer.on('data', (raw: Uint8Array | string) => {
      try {
        const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
        const msg = JSON.parse(text);
        if (msg && msg.type === 'visibility' && typeof msg.hidden === 'boolean') {
          rtcLog(`[Video/peer] ${peerId.slice(0,6)} visibility hidden=${msg.hidden}`);
          setPeerHiddenMap(prev => {
            const next = new Map(prev);
            next.set(peerId, msg.hidden);
            return next;
          });
        } else if (msg && msg.type === 'reaction' && typeof msg.emoji === 'string') {
          showReaction(peerId, msg.emoji.slice(0, 8));
        }
      } catch {
        // not JSON / unknown payload — ignore
      }
    });

    peer.on('connect', () => {
      // On a fresh connection, send our current visibility state so the
      // peer initialises with the right placeholder for us.
      try {
        peer.send(JSON.stringify({ type: 'visibility', hidden: document.hidden }));
      } catch { /* noop */ }
    });

    peer.on('connect', () => {
      rtcLog(`[Video/webrtc] Peer ${peerId} connected`);
      // Cap upload bitrate after the connection is established. We do this on
      // every reconnect/renegotiate too — simple-peer fires 'connect' fresh.
      const pcInner = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
      if (pcInner) {
        setMaxVideoBitrate(pcInner, MAX_VIDEO_KBPS).catch(() => { /* noop */ });
      }
    });

    peer.on('close', () => {
      rtcLog(`[Video/webrtc] Peer ${peerId} closed`);
      cleanupPeer(peerId);
    });

    peer.on('error', (err: Error) => {
      console.error(`[Video/webrtc] Peer ${peerId} error:`, err);
      cleanupPeer(peerId);
    });

    peersRef.current.set(peerId, peer);
    return peer;
  }, [socket, roomCode, attachRemoteHark, cleanupPeer, addConnecting, removeConnecting, showReaction]);

  // ============================================================================
  // Device Management
  // ============================================================================

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error('[Video/webrtc] Failed to enumerate devices:', error);
    }
  }, []);

  // ============================================================================
  // Media Management
  // ============================================================================

  const startMedia = useCallback(async () => {
    if (localStream) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      rtcLog('[Video/webrtc] Requesting media access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(selectedCameraId || undefined),
        audio: getAudioConstraints(selectedMicrophoneId || undefined)
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsCameraEnabled(stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled);
      setIsAudioEnabled(stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled);

      rtcLog('[Video/webrtc] Media access granted');

      await refreshDevices();

      // Note: peer broadcast is gated until confirmVideoChat() — startMedia
      // is local-preview-only. Don't emit 'webrtc:enable-video' here.
    } catch (error) {
      console.error('[Video/webrtc] Media access failed:', error);
      setConnectionError('Failed to access camera/microphone');
    } finally {
      setIsConnecting(false);
    }
  }, [localStream, selectedCameraId, selectedMicrophoneId, socket, roomCode, refreshDevices]);

  const stopMedia = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    peersRef.current.forEach((_, peerId) => cleanupPeer(peerId));

    if (localHarkRef.current) {
      try { localHarkRef.current.stop(); } catch { /* noop */ }
      localHarkRef.current = null;
    }

    if (noiseSuppressionServiceRef.current) {
      try { noiseSuppressionServiceRef.current.dispose(); } catch { /* noop */ }
      noiseSuppressionServiceRef.current = null;
    }

    setRemoteStreams(new Map());
    setSpeakingPeers(new Set());
    setConnectingPeers(new Set());
    setPeerQuality(new Map());
    setPeerReactions(new Map());
    setIsPushToTalkActive(false);
    appliedBitrateRef.current = MAX_VIDEO_KBPS;
    rtcLog('[Video/webrtc] Media stopped');
  }, [localStream, cleanupPeer]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraEnabled(videoTracks.length > 0 && videoTracks[0].enabled);
    }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(audioTracks.length > 0 && audioTracks[0].enabled);
    }
  }, [localStream]);

  // ============================================================================
  // Two-Stage Video Join Flow
  // ============================================================================

  const prepareVideoChat = useCallback(async () => {
    if (isVideoPrepairing || isVideoChatActive) return;

    setIsVideoPrepairing(true);
    setConnectionError(null);

    try {
      rtcLog('[Video/webrtc] Preparing video chat...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(selectedCameraId || undefined),
        audio: getAudioConstraints(selectedMicrophoneId || undefined)
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      rtcLog('[Video/webrtc] Setting localStream - tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));

      // Mute audio during preview so user doesn't hear echo
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      rtcLog('[Video/webrtc] Video chat prepared - waiting for user to confirm in modal');
      await refreshDevices();
    } catch (error) {
      console.error('[Video/webrtc] Failed to prepare video chat:', error);
      setConnectionError('Failed to access camera/microphone');
      setIsVideoPrepairing(false);
    }
  }, [isVideoPrepairing, isVideoChatActive, selectedCameraId, selectedMicrophoneId, refreshDevices]);

  const confirmVideoChat = useCallback(async () => {
    if (!localStream || !isVideoPrepairing) return;

    rtcLog('[Video/webrtc] Confirming video chat...');

    const joinMuted = localStorage.getItem('joinMuted') === 'true';
    const joinCameraOff = localStorage.getItem('joinCameraOff') === 'true';
    const virtualBgEnabled = localStorage.getItem('virtualBgEnabled') === 'true';
    const virtualBgType = localStorage.getItem('virtualBgType') || 'blur';
    const virtualBgImage = localStorage.getItem('virtualBgImage') || '';
    const supportsVirtualBg = 'MediaStreamTrackProcessor' in window && 'MediaStreamTrackGenerator' in window;

    let activeStream = localStream;

    rtcLog('[Video/vb] resolved settings:', {
      enabled: virtualBgEnabled,
      type: virtualBgType,
      image: virtualBgImage ? virtualBgImage.slice(0, 60) : null,
      browserSupported: supportsVirtualBg,
      joinCameraOff,
      willApply: virtualBgEnabled && supportsVirtualBg && !joinCameraOff,
    });

    if (virtualBgEnabled && supportsVirtualBg && !joinCameraOff) {
      let stage = 'construct';
      try {
        rtcLog(`[Video/vb] Constructing service (type=${virtualBgType})...`);
        const config = {
          ...DEFAULT_VIRTUAL_BACKGROUND_CONFIG,
          useBlur: virtualBgType === 'blur',
          backgroundImageUrl: virtualBgType === 'image' ? virtualBgImage : undefined
        };
        const { VirtualBackgroundService } = await import('../services/virtualBackgroundService');
        const vbService = new VirtualBackgroundService(config);
        stage = 'initialize';
        rtcLog('[Video/vb] Calling initialize()...');
        await vbService.initialize();
        stage = 'setupAndStart';
        rtcLog('[Video/vb] initialize() complete, setupAndStart() on stream:',
          localStream.id, localStream.getVideoTracks().map(t => `${t.id.slice(0,8)}:${t.readyState}`));
        activeStream = await vbService.setupAndStart(localStream);
        virtualBgServiceRef.current = vbService;
        setLocalStream(activeStream);
        localStreamRef.current = activeStream;
        rtcLog('[Video/vb] ✅ applied — new stream id:', activeStream.id);
      } catch (error) {
        const e = error as Error;
        console.error(`[Video/vb] ❌ failed at stage="${stage}":`, e.name, e.message);
        if (e.stack) console.error('[Video/vb] stack:', e.stack);
        console.warn('[Video/vb] falling back to original stream');
        activeStream = localStream;
      }
    } else if (virtualBgEnabled && !supportsVirtualBg) {
      console.warn('[Video/vb] not supported — browser missing MediaStreamTrackProcessor/Generator');
    }

    // Face avatar (raccoon/robot/cat/etc) — applied to whatever stream came out
    // of the virtual-background step, so users can stack: e.g. blur background +
    // raccoon face. The DeviceSettingsModal UI writes 'avatarEnabled'/'avatarType'
    // (legacy keys); we accept both names so older + newer call sites both work.
    const faceAvatarEnabled =
      localStorage.getItem('avatarEnabled') === 'true' ||
      localStorage.getItem('faceAvatarEnabled') === 'true';
    const faceAvatarType = (
      localStorage.getItem('avatarType') ||
      localStorage.getItem('faceAvatarType') ||
      'raccoon'
    ) as FaceAvatarConfig['avatarType'];
    const supportsFaceAvatar = supportsVirtualBg; // same browser API requirement

    rtcLog('[Video/fa] resolved settings:', {
      enabled: faceAvatarEnabled,
      type: faceAvatarType,
      browserSupported: supportsFaceAvatar,
      joinCameraOff,
      willApply: faceAvatarEnabled && supportsFaceAvatar && !joinCameraOff,
    });

    if (faceAvatarEnabled && supportsFaceAvatar && !joinCameraOff) {
      let stage = 'construct';
      try {
        rtcLog(`[Video/fa] Constructing service (type=${faceAvatarType})...`);
        const { FaceAvatarService } = await import('../services/faceAvatarService');
        const fa = new FaceAvatarService({ ...DEFAULT_AVATAR_CONFIG, avatarType: faceAvatarType });
        stage = 'initialize';
        rtcLog('[Video/fa] Calling initialize() (loads MediaPipe wasm + face_landmarker.task model)...');
        await fa.initialize();
        stage = 'setupAndStart';
        rtcLog('[Video/fa] initialize() complete, now setupAndStart() on stream:',
          activeStream.id, activeStream.getVideoTracks().map(t => `${t.id.slice(0,8)}:${t.readyState}`));
        const faStream = await fa.setupAndStart(activeStream);
        faceAvatarServiceRef.current = fa;
        activeStream = faStream;
        setLocalStream(activeStream);
        localStreamRef.current = activeStream;
        rtcLog('[Video/fa] ✅ applied — new stream id:', faStream.id,
          'tracks:', faStream.getVideoTracks().map(t => `${t.id.slice(0,8)}:${t.kind}:${t.readyState}`));
      } catch (error) {
        const e = error as Error;
        console.error(`[Video/fa] ❌ failed at stage="${stage}":`, e.name, e.message);
        if (e.stack) console.error('[Video/fa] stack:', e.stack);
      }
    } else if (faceAvatarEnabled && !supportsFaceAvatar) {
      console.warn('[Video/fa] not supported — browser missing MediaStreamTrackProcessor/Generator');
    }

    // Noise suppression (RNNoise) — applied last on the audio track.
    activeStream = await applyNoiseSuppression(activeStream);
    setLocalStream(activeStream);
    localStreamRef.current = activeStream;

    // Push-to-talk: start muted; the mic only opens while the PTT key is held.
    const pttOn = localStorage.getItem('pttEnabled') === 'true';
    const startMuted = joinMuted || pttOn;

    activeStream.getAudioTracks().forEach(track => {
      track.enabled = !startMuted;
    });
    activeStream.getVideoTracks().forEach(track => {
      track.enabled = !joinCameraOff;
    });

    setIsAudioEnabled(!startMuted);
    setIsCameraEnabled(!joinCameraOff);
    setIsVideoChatActive(true);
    setIsVideoPrepairing(false);

    if (socket && roomCode) {
      socket.emit('webrtc:enable-video', { roomCode, connectionType: 'camera' });

      // Late-joiner sync: ask server who is already in video chat so we can
      // initiate offers to anyone we missed before our local stream was ready.
      socket.emit('webrtc:get-active-peers', { roomCode });

      // Re-announce after 2s to catch peers whose join happened in the same tick.
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('webrtc:enable-video', { roomCode, connectionType: 'camera' });
        }
      }, 2000);
    }

    rtcLog('[Video/webrtc] Video chat enabled (muted:', startMuted, ', camera off:', joinCameraOff, ', virtualBg:', virtualBgEnabled && supportsVirtualBg, ', faceAvatar:', faceAvatarEnabled && supportsFaceAvatar, ', ptt:', pttOn, ')');
  }, [localStream, isVideoPrepairing, socket, roomCode, applyNoiseSuppression]);

  const disableVideoChat = useCallback(() => {
    rtcLog('[Video/webrtc] Disabling video chat...');

    if (socket && roomCode) {
      socket.emit('webrtc:disable-video', { roomCode });
    }

    if (virtualBgServiceRef.current) {
      virtualBgServiceRef.current.dispose();
      virtualBgServiceRef.current = null;
    }

    if (faceAvatarServiceRef.current) {
      try { faceAvatarServiceRef.current.dispose?.(); } catch { /* noop */ }
      faceAvatarServiceRef.current = null;
    }

    if (noiseSuppressionServiceRef.current) {
      try { noiseSuppressionServiceRef.current.dispose(); } catch { /* noop */ }
      noiseSuppressionServiceRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    if (localHarkRef.current) {
      try { localHarkRef.current.stop(); } catch { /* noop */ }
      localHarkRef.current = null;
    }

    peersRef.current.forEach((_, peerId) => cleanupPeer(peerId));

    setRemoteStreams(new Map());
    setSpeakingPeers(new Set());
    setConnectingPeers(new Set());
    setPeerQuality(new Map());
    setPeerReactions(new Map());
    setIsPushToTalkActive(false);
    appliedBitrateRef.current = MAX_VIDEO_KBPS;
    setIsVideoChatActive(false);
    setIsCameraEnabled(true);
    setIsVideoPrepairing(false);
    videoPeersRef.current.clear();

    rtcLog('[Video/webrtc] Video chat disabled');
  }, [localStream, socket, roomCode, cleanupPeer]);

  const cancelVideoPreparation = useCallback(() => {
    rtcLog('[Video/webrtc] Canceling video preparation...');

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    setIsVideoPrepairing(false);
  }, [localStream]);

  // Track replacement helpers (used when user switches camera/mic mid-call)
  const replaceTracksOnPeers = useCallback((
    oldStream: MediaStream,
    newStream: MediaStream
  ) => {
    const oldVideo = oldStream.getVideoTracks()[0];
    const newVideo = newStream.getVideoTracks()[0];
    const oldAudio = oldStream.getAudioTracks()[0];
    const newAudio = newStream.getAudioTracks()[0];

    peersRef.current.forEach((peer, peerId) => {
      try {
        if (oldVideo && newVideo) peer.replaceTrack(oldVideo, newVideo, oldStream);
        if (oldAudio && newAudio) peer.replaceTrack(oldAudio, newAudio, oldStream);
      } catch (err) {
        console.error(`[Video/webrtc] Failed to replace tracks on peer ${peerId}:`, err);
      }
    });
  }, []);

  // Build a base MediaStream from the user's camera/mic — used by the apply*
  // helpers when they need to start over from a clean source (we can't reuse
  // an already-processed stream as input to a new processor).
  const captureBaseStream = useCallback(async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      video: getVideoConstraints(selectedCameraId || undefined),
      audio: getAudioConstraints(selectedMicrophoneId || undefined),
    });
  }, [selectedCameraId, selectedMicrophoneId]);

  // Mid-session: re-read VB + FA settings, rebuild the FULL processed pipeline
  // (base → VB → FA), swap tracks on every peer, then dispose the previous
  // services. Critical ordering:
  //   1. Capture fresh base stream and build new chain BEFORE touching old.
  //   2. replaceTracksOnPeers — peers now consume the new track.
  //   3. Stop old tracks + dispose old services AFTER step 2 so peers don't
  //      see a dead track during the ~500-2000ms init window.
  // Both apply* hooks delegate to this so toggling VB doesn't drop FA and
  // vice versa.
  const rebuildMediaPipeline = useCallback(async () => {
    if (!localStreamRef.current) {
      console.warn('[Video/webrtc] rebuildMediaPipeline called with no localStream — ignoring');
      return;
    }
    const supports = 'MediaStreamTrackProcessor' in window && 'MediaStreamTrackGenerator' in window;
    const vbEnabled = localStorage.getItem('virtualBgEnabled') === 'true' && supports;
    const vbType = (localStorage.getItem('virtualBgType') || 'blur') as 'blur' | 'image';
    const vbImage = localStorage.getItem('virtualBgImage') || '';
    const faEnabled = supports && (
      localStorage.getItem('avatarEnabled') === 'true' ||
      localStorage.getItem('faceAvatarEnabled') === 'true'
    );
    const faType = (
      localStorage.getItem('avatarType') ||
      localStorage.getItem('faceAvatarType') ||
      'raccoon'
    ) as FaceAvatarConfig['avatarType'];
    rtcLog('[Video/webrtc] rebuildMediaPipeline:', { vbEnabled, vbType, faEnabled, faType, supports });

    let chain: MediaStream;
    let newVb: VirtualBackgroundService | null = null;
    let newFa: FaceAvatarService | null = null;
    try {
      chain = await captureBaseStream();
      if (vbEnabled) {
        const { VirtualBackgroundService } = await import('../services/virtualBackgroundService');
        newVb = new VirtualBackgroundService({
          ...DEFAULT_VIRTUAL_BACKGROUND_CONFIG,
          useBlur: vbType === 'blur',
          backgroundImageUrl: vbType === 'image' ? vbImage : undefined,
        });
        await newVb.initialize();
        chain = await newVb.setupAndStart(chain);
        rtcLog('[Video/vb] rebuilt ✅');
      }
      if (faEnabled) {
        const { FaceAvatarService } = await import('../services/faceAvatarService');
        newFa = new FaceAvatarService({ ...DEFAULT_AVATAR_CONFIG, avatarType: faType });
        await newFa.initialize();
        chain = await newFa.setupAndStart(chain);
        rtcLog('[Video/fa] rebuilt ✅');
      }
    } catch (err) {
      console.error('[Video/webrtc] rebuildMediaPipeline failed:', err);
      // Clean up partial services so we don't leak
      try { newVb?.dispose(); } catch { /* noop */ }
      try { newFa?.dispose?.(); } catch { /* noop */ }
      return;
    }

    // Re-apply noise suppression on the rebuilt audio (disposes the prior NS).
    chain = await applyNoiseSuppression(chain);

    const old = localStreamRef.current;
    const oldVb = virtualBgServiceRef.current;
    const oldFa = faceAvatarServiceRef.current;

    // Step 1: peers now consume the new track (transparent replaceTrack).
    replaceTracksOnPeers(old, chain);

    // Step 2: swap refs.
    virtualBgServiceRef.current = newVb;
    faceAvatarServiceRef.current = newFa;
    setLocalStream(chain);
    localStreamRef.current = chain;

    // Step 3: tear down the old chain AFTER peers are on the new track. Order
    // here matters: dispose old services first (closes their writable, ending
    // the old generator track), THEN stop the raw camera tracks.
    try { oldVb?.dispose(); } catch { /* noop */ }
    try { oldFa?.dispose?.(); } catch { /* noop */ }
    old.getTracks().forEach(t => t.stop());
  }, [captureBaseStream, replaceTracksOnPeers, applyNoiseSuppression]);

  // Public hooks kept for API compatibility — all rebuild the full chain so
  // toggling one stage (VB / avatar / noise suppression) doesn't drop another.
  const applyVirtualBgFromSettings = useCallback(async () => {
    await rebuildMediaPipeline();
  }, [rebuildMediaPipeline]);

  const applyFaceAvatarFromSettings = useCallback(async () => {
    await rebuildMediaPipeline();
  }, [rebuildMediaPipeline]);

  const applyNoiseSuppressionFromSettings = useCallback(async () => {
    await rebuildMediaPipeline();
  }, [rebuildMediaPipeline]);

  const setSelectedCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);

    if (localStream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(deviceId),
          audio: getAudioConstraints(selectedMicrophoneId || undefined)
        });

        const finalStream = await applyNoiseSuppression(newStream);
        replaceTracksOnPeers(localStream, finalStream);

        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(finalStream);
        localStreamRef.current = finalStream;
      } catch (error) {
        console.error('[Video/webrtc] Failed to switch camera:', error);
      }
    }
  }, [localStream, selectedMicrophoneId, replaceTracksOnPeers, applyNoiseSuppression]);

  const setSelectedMicrophone = useCallback(async (deviceId: string) => {
    setSelectedMicrophoneId(deviceId);

    if (localStream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(selectedCameraId || undefined),
          audio: getAudioConstraints(deviceId)
        });

        const finalStream = await applyNoiseSuppression(newStream);
        replaceTracksOnPeers(localStream, finalStream);

        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(finalStream);
        localStreamRef.current = finalStream;
      } catch (error) {
        console.error('[Video/webrtc] Failed to switch microphone:', error);
      }
    }
  }, [localStream, selectedCameraId, replaceTracksOnPeers, applyNoiseSuppression]);

  // ============================================================================
  // Local hark — drive own speaking indicator
  // ============================================================================

  useEffect(() => {
    if (!localStream || !socket?.id) return;

    if (localHarkRef.current) {
      try { localHarkRef.current.stop(); } catch { /* noop */ }
      localHarkRef.current = null;
    }

    if (!localStream.getAudioTracks().length) return;

    const myId = socket.id;
    try {
      const speech = hark(localStream, { interval: HARK_INTERVAL, threshold: HARK_THRESHOLD, play: false });
      speech.on('speaking', () => addSpeaker(myId));
      speech.on('stopped_speaking', () => removeSpeaker(myId));
      localHarkRef.current = speech;
    } catch (err) {
      console.error('[Video/webrtc] Failed to attach local hark:', err);
    }

    return () => {
      if (localHarkRef.current) {
        try { localHarkRef.current.stop(); } catch { /* noop */ }
        localHarkRef.current = null;
      }
      removeSpeaker(myId);
    };
  }, [localStream, socket?.id, addSpeaker, removeSpeaker]);

  // ============================================================================
  // Signaling
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    const handlePeerEnabledVideo = ({ peerId }: { peerId: string; connectionType?: string }) => {
      if (peerId === socket.id) return;

      videoPeersRef.current.add(peerId);

      if (!localStreamRef.current) {
        // We'll connect to them once we have our own stream (handled by the
        // connectToKnownPeers effect below).
        return;
      }

      const existing = peersRef.current.get(peerId);
      if (existing && !existing.destroyed) return;

      // Surface the joining peer as a "connecting…" tile right away. If we
      // initiate, createPeer keeps the flag; if we wait for their offer, this
      // keeps the tile visible during the gap before the peer object exists.
      addConnecting(peerId);

      // Smaller socket id initiates to avoid offer/answer collision
      const shouldInitiate = !!socket.id && socket.id < peerId;
      if (shouldInitiate) {
        createPeer(peerId, true);
      }
    };

    const handlePeerDisabledVideo = ({ peerId }: { peerId: string }) => {
      videoPeersRef.current.delete(peerId);
      cleanupPeer(peerId);
    };

    const handleOffer = ({ fromPeerId, offer }: { fromPeerId: string; offer: SimplePeer.SignalData }) => {
      let peer = peersRef.current.get(fromPeerId);
      if (!peer || peer.destroyed) {
        const created = createPeer(fromPeerId, false);
        if (!created) return;
        peer = created;
      }
      try {
        peer.signal(offer);
      } catch (err) {
        console.error(`[Video/webrtc] Failed to apply offer from ${fromPeerId}:`, err);
      }
    };

    const handleAnswer = ({ fromPeerId, answer }: { fromPeerId: string; answer: SimplePeer.SignalData }) => {
      const peer = peersRef.current.get(fromPeerId);
      if (!peer || peer.destroyed) return;
      try {
        peer.signal(answer);
      } catch (err) {
        console.error(`[Video/webrtc] Failed to apply answer from ${fromPeerId}:`, err);
      }
    };

    const handleIceCandidate = ({ fromPeerId, candidate }: { fromPeerId: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current.get(fromPeerId);
      if (!peer || peer.destroyed) return;
      try {
        peer.signal({ candidate } as SimplePeer.SignalData);
      } catch (err) {
        console.error(`[Video/webrtc] Failed to add ICE candidate from ${fromPeerId}:`, err);
      }
    };

    const handlePeerLeft = ({ peerId }: { peerId: string }) => {
      videoPeersRef.current.delete(peerId);
      cleanupPeer(peerId);
    };

    // A peer's socket reconnected with a new id. The connection keyed by the
    // old id is dead (its signaling channel is gone), so tear it down and
    // re-establish under the new id. The reconnected side does NOT receive
    // this event, so we always initiate from here — one side per pair, no glare.
    const handlePeerReconnected = (
      { oldPeerId, newPeerId }: { oldPeerId: string; newPeerId: string; playerId?: string; playerName?: string }
    ) => {
      if (!oldPeerId || !newPeerId || oldPeerId === newPeerId) return;
      if (newPeerId === socket.id) return;
      rtcLog(`[Video/webrtc] peer reconnected ${oldPeerId.slice(0, 6)} → ${newPeerId.slice(0, 6)} — rematching`);
      videoPeersRef.current.delete(oldPeerId);
      cleanupPeer(oldPeerId);
      videoPeersRef.current.add(newPeerId);
      if (localStreamRef.current) {
        const existing = peersRef.current.get(newPeerId);
        if (!existing || existing.destroyed) {
          createPeer(newPeerId, true);
        }
      } else {
        // We'll reconnect once our own stream is ready (connectToKnownPeers).
        addConnecting(newPeerId);
      }
    };


    // Late-joiner sync: server sends us the list of peers already in video chat.
    const handleActivePeers = ({ peerIds }: { peerIds: string[] }) => {
      for (const peerId of peerIds) {
        handlePeerEnabledVideo({ peerId });
      }
    };
    socket.on('webrtc:peer-enabled-video', handlePeerEnabledVideo);
    socket.on('webrtc:peer-disabled-video', handlePeerDisabledVideo);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:peer-left', handlePeerLeft);
    socket.on('webrtc:peer-reconnected', handlePeerReconnected);
    socket.on('webrtc:active-peers', handleActivePeers);

    rtcLog('[Video/webrtc] Registered socket event handlers');

    return () => {
      socket.off('webrtc:peer-enabled-video', handlePeerEnabledVideo);
      socket.off('webrtc:peer-disabled-video', handlePeerDisabledVideo);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:peer-left', handlePeerLeft);
      socket.off('webrtc:peer-reconnected', handlePeerReconnected);
      socket.off('webrtc:active-peers', handleActivePeers);
    };
  }, [socket, createPeer, cleanupPeer, addConnecting]);

  // Late-joiner: connect to peers we already know about once our local stream is ready
  useEffect(() => {
    if (!socket || !localStream || !isVideoChatActive) return;

    const connectToKnownPeers = () => {
      for (const peerId of videoPeersRef.current) {
        if (peerId === socket.id) continue;
        const existing = peersRef.current.get(peerId);
        if (existing && !existing.destroyed) continue;

        const shouldInitiate = !!socket.id && socket.id < peerId;
        if (shouldInitiate) {
          createPeer(peerId, true);
        }
      }
    };

    const timeoutId = setTimeout(connectToKnownPeers, 100);
    return () => clearTimeout(timeoutId);
  }, [socket, localStream, isVideoChatActive, createPeer]);

  // Pre-fetch Cloudflare TURN credentials once. Sync with localStorage cache,
  // refresh in background. Caches for 23h; one network hit per user per day max.
  useEffect(() => {
    prefetchTurnCredentials().catch(() => { /* logged inside */ });
  }, []);

  // Track-level mute/unmute logging — browsers fire these when they pause
  // a backgrounded tab's media tracks. Helps diagnose tab-switch behaviour.
  useEffect(() => {
    if (!localStream) return;

    const attachedTracks: MediaStreamTrack[] = [];
    const handlers: Array<() => void> = [];

    localStream.getTracks().forEach(track => {
      const onMute = () => rtcLog(`[Video/track] mute | id=${track.id.slice(0,8)} kind=${track.kind} state=${track.readyState}`);
      const onUnmute = () => rtcLog(`[Video/track] unmute | id=${track.id.slice(0,8)} kind=${track.kind} state=${track.readyState}`);
      const onEnded = () => rtcLog(`[Video/track] ended | id=${track.id.slice(0,8)} kind=${track.kind}`);
      track.addEventListener('mute', onMute);
      track.addEventListener('unmute', onUnmute);
      track.addEventListener('ended', onEnded);
      attachedTracks.push(track);
      handlers.push(() => {
        track.removeEventListener('mute', onMute);
        track.removeEventListener('unmute', onUnmute);
        track.removeEventListener('ended', onEnded);
      });
    });

    rtcLog(`[Video/track] attached listeners | ${attachedTracks.map(t => `${t.kind}:${t.id.slice(0,8)}`).join(', ')}`);

    return () => {
      handlers.forEach(fn => fn());
    };
  }, [localStream]);

  // Pause local video when the tab is hidden — backgrounded tabs are pure
  // bandwidth waste on TURN-relayed legs. Audio stays on so voice calls keep
  // working when the user alt-tabs. Resumed when tab becomes visible again.
  useEffect(() => {
    if (!isVideoChatActive) return;

    const snapshotTracks = (stream: MediaStream | null) => {
      if (!stream) return 'no-stream';
      return stream.getTracks()
        .map(t => `${t.kind}:enabled=${t.enabled},muted=${t.muted},state=${t.readyState}`)
        .join(' | ');
    };

    const snapshotPeers = () => {
      const out: string[] = [];
      peersRef.current.forEach((peer, peerId) => {
        const pc = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
        if (pc) {
          out.push(`${peerId.slice(0,6)}:cs=${pc.connectionState},ice=${pc.iceConnectionState}`);
        } else {
          out.push(`${peerId.slice(0,6)}:no-pc`);
        }
      });
      return out.length ? out.join(' | ') : 'no-peers';
    };

    const logVisibility = (event: string) => {
      rtcLog(
        `[Video/visibility] ${event} | state=${document.visibilityState} hidden=${document.hidden}`
        + ` | tracks=${snapshotTracks(localStreamRef.current)}`
        + ` | peers=${snapshotPeers()}`
        + ` | vbActive=${!!virtualBgServiceRef.current} faActive=${!!faceAvatarServiceRef.current}`
      );
    };

    const broadcastVisibility = (hidden: boolean) => {
      peersRef.current.forEach((peer, peerId) => {
        if (peer.destroyed) return;
        try {
          peer.send(JSON.stringify({ type: 'visibility', hidden }));
        } catch (err) {
          // Data channel not open yet, or peer in transition. Best-effort.
          rtcLog(`[Video/peer] ${peerId.slice(0,6)} visibility broadcast skipped:`, (err as Error).message);
        }
      });
    };

    const handleVisibility = () => {
      logVisibility('visibilitychange');
      // Keep the video stream flowing while tabbed out — Chrome exempts
      // tabs with active RTCPeerConnections from heavy throttling, so the
      // capture + encoder + send pipeline keeps producing frames. The
      // data-channel `visibility` signal we just broadcast lets the
      // receiver overlay an "Away" badge while still showing the live
      // video.
      broadcastVisibility(document.hidden);
    };

    const handlePageHide = () => logVisibility('pagehide');
    const handlePageShow = () => logVisibility('pageshow');
    const handleFocus = () => logVisibility('focus');
    const handleBlur = () => logVisibility('blur');

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isVideoChatActive]);

  // ============================================================================
  // Connection-quality polling + adaptive upload bitrate
  // ============================================================================
  useEffect(() => {
    if (!isVideoChatActive) return;

    let cancelled = false;

    type Stat = {
      type?: string; kind?: string;
      packetsLost?: number; packetsReceived?: number; jitter?: number;
      fractionLost?: number; roundTripTime?: number; currentRoundTripTime?: number;
      nominated?: boolean; state?: string;
    };

    const classify = (lossPct: number, rttMs: number): PeerQuality => {
      if (lossPct > 5 || rttMs > 400) return 'poor';
      if (lossPct > 2 || rttMs > 250) return 'ok';
      return 'good';
    };

    const poll = async () => {
      const peers = Array.from(peersRef.current.entries());
      if (!peers.length) return;

      const nextQuality = new Map<string, PeerQuality>();
      let worstOutboundLoss = 0; // receiver-reported fractionLost about OUR upload

      await Promise.all(peers.map(async ([peerId, peer]) => {
        const pc = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
        if (!pc || typeof pc.getStats !== 'function') return;
        try {
          const stats = await pc.getStats();
          let inLost = 0, inRecv = 0, rttMs = 0;
          stats.forEach((report) => {
            const r = report as unknown as Stat;
            if (r.type === 'inbound-rtp' && r.kind === 'video') {
              inLost += r.packetsLost || 0;
              inRecv += r.packetsReceived || 0;
            } else if (r.type === 'remote-inbound-rtp' && r.kind === 'video') {
              if (typeof r.fractionLost === 'number') {
                worstOutboundLoss = Math.max(worstOutboundLoss, r.fractionLost * 100);
              }
              if (typeof r.roundTripTime === 'number') rttMs = Math.max(rttMs, r.roundTripTime * 1000);
            } else if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') {
              if (typeof r.currentRoundTripTime === 'number') {
                rttMs = Math.max(rttMs, r.currentRoundTripTime * 1000);
              }
            }
          });
          const lossPct = (inRecv + inLost) > 0 ? (inLost / (inRecv + inLost)) * 100 : 0;
          nextQuality.set(peerId, classify(lossPct, rttMs));
        } catch { /* getStats can throw mid-teardown */ }
      }));

      if (cancelled) return;

      setPeerQuality(prev => {
        let changed = prev.size !== nextQuality.size;
        if (!changed) {
          for (const [k, v] of nextQuality) {
            if (prev.get(k) !== v) { changed = true; break; }
          }
        }
        return changed ? nextQuality : prev;
      });

      // Adaptive upload bitrate: peer-count-scaled ceiling, backed off on
      // receiver-reported loss. More peers => lower per-stream cap so the
      // aggregate stays bounded on TURN-relayed legs.
      const peerCount = peers.length;
      let target = peerCount <= 2 ? MAX_VIDEO_KBPS_HIGH
                 : peerCount <= 4 ? MAX_VIDEO_KBPS
                 : MIN_VIDEO_KBPS + 100;
      if (worstOutboundLoss > 8) target = MIN_VIDEO_KBPS;
      else if (worstOutboundLoss > 3) target = Math.max(MIN_VIDEO_KBPS, Math.round(target * 0.6));
      target = Math.max(MIN_VIDEO_KBPS, Math.min(MAX_VIDEO_KBPS_HIGH, target));

      const current = appliedBitrateRef.current;
      if (Math.abs(target - current) / current > 0.15) {
        appliedBitrateRef.current = target;
        rtcLog(`[Video/stats] adapting upload ${current} → ${target} kbps (peers=${peerCount}, outLoss=${worstOutboundLoss.toFixed(1)}%)`);
        peersRef.current.forEach((peer) => {
          const pc = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
          if (pc) setMaxVideoBitrate(pc, target).catch(() => { /* noop */ });
        });
      }
    };

    const intervalId = setInterval(poll, STATS_INTERVAL_MS);
    const warmId = setTimeout(poll, 1500);
    return () => { cancelled = true; clearInterval(intervalId); clearTimeout(warmId); };
  }, [isVideoChatActive]);

  // ============================================================================
  // Idle-time model warm — prefetch MediaPipe / avatar assets the user has
  // enabled so the first confirmVideoChat() doesn't stall building the
  // pipeline. Gated on enabled-features so we don't waste bandwidth.
  // ============================================================================
  useEffect(() => {
    const warm = () => {
      try {
        const base = import.meta.env.BASE_URL;
        const urls: string[] = [];
        if (localStorage.getItem('virtualBgEnabled') === 'true') {
          urls.push(base + 'models/selfie_multiclass_256x256.tflite');
        }
        const avatarOn = localStorage.getItem('avatarEnabled') === 'true'
          || localStorage.getItem('faceAvatarEnabled') === 'true';
        if (avatarOn) {
          urls.push(base + 'models/face_landmarker.task');
          const type = localStorage.getItem('avatarType') || localStorage.getItem('faceAvatarType') || 'raccoon';
          const glb: Record<string, string> = {
            raccoon: 'raccoon_head.glb', metahuman: 'metahuman_head.glb',
            robot: 'robot_head.glb', alien: 'alien_head.glb',
            cat: 'cat.glb', panda: 'panda.glb', pug: 'pug.glb', bunny: 'bunny.glb',
          };
          urls.push(base + 'models/' + (glb[type] || 'raccoon_head.glb'));
        }
        urls.forEach(u => { fetch(u, { cache: 'force-cache' }).catch(() => { /* warm only */ }); });
      } catch { /* noop */ }
    };
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let toId: ReturnType<typeof setTimeout> | undefined;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(warm, { timeout: 4000 });
    else toId = setTimeout(warm, 2500);
    return () => {
      if (idleId !== undefined && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (toId) clearTimeout(toId);
    };
  }, []);

  // ============================================================================
  // Push-to-talk — when enabled, the mic stays muted until Space is held.
  // ============================================================================
  useEffect(() => {
    if (!isVideoChatActive || !pttEnabled) return;

    // Entering PTT mode: mute until the user holds the key.
    setMicEnabled(false);
    setIsPushToTalkActive(false);

    const isTypingTarget = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable === true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      if (isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      setMicEnabled(true);
      setIsPushToTalkActive(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      setMicEnabled(false);
      setIsPushToTalkActive(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      // Leaving PTT mode (disabled mid-call or call ended): restore the mic.
      setIsPushToTalkActive(false);
      setMicEnabled(true);
    };
  }, [isVideoChatActive, pttEnabled, setMicEnabled]);

  // Cleanup on unmount — read refs directly to avoid effect re-runs
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peersRef.current.forEach(peer => {
        try { peer.destroy(); } catch { /* noop */ }
      });
      peersRef.current.clear();
      harksRef.current.forEach(speech => {
        try { speech.stop(); } catch { /* noop */ }
      });
      harksRef.current.clear();
      if (localHarkRef.current) {
        try { localHarkRef.current.stop(); } catch { /* noop */ }
        localHarkRef.current = null;
      }
      if (noiseSuppressionServiceRef.current) {
        try { noiseSuppressionServiceRef.current.dispose(); } catch { /* noop */ }
        noiseSuppressionServiceRef.current = null;
      }
      reactionTimersRef.current.forEach(timer => clearTimeout(timer));
      reactionTimersRef.current.clear();
      rtcLog('[Video/webrtc] Cleanup on unmount');
    };
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const isLocalSpeaking = !!socket?.id && speakingPeers.has(socket.id);

  const contextValue = useMemo<WebRTCContextState>(() => ({
    localStream,
    isVideoChatActive,
    isCameraEnabled,
    isAudioEnabled,
    isVideoEnabled: isVideoChatActive,
    remoteStreams,
    peerHiddenMap,
    speakingPeers,
    isLocalSpeaking,
    connectingPeers,
    peerQuality,
    peerVolume,
    locallyMutedPeers,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
    isVideoPrepairing,
    prepareVideoChat,
    confirmVideoChat,
    cancelVideoPreparation,
    disableVideoChat,
    isConnecting,
    connectionError,
    selectedCameraId,
    selectedMicrophoneId,
    setSelectedCamera,
    setSelectedMicrophone,
    availableDevices,
    refreshDevices,
    setPeerVolume,
    toggleLocalMute,
    peerReactions,
    sendReaction,
    pttEnabled,
    setPttEnabled,
    isPushToTalkActive,
    applyFaceAvatarFromSettings,
    applyVirtualBgFromSettings,
    applyNoiseSuppressionFromSettings
  }), [
    localStream,
    isVideoChatActive,
    isCameraEnabled,
    isAudioEnabled,
    remoteStreams,
    peerHiddenMap,
    speakingPeers,
    isLocalSpeaking,
    connectingPeers,
    peerQuality,
    peerVolume,
    locallyMutedPeers,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
    isVideoPrepairing,
    prepareVideoChat,
    confirmVideoChat,
    cancelVideoPreparation,
    disableVideoChat,
    isConnecting,
    connectionError,
    selectedCameraId,
    selectedMicrophoneId,
    setSelectedCamera,
    setSelectedMicrophone,
    availableDevices,
    refreshDevices,
    setPeerVolume,
    toggleLocalMute,
    peerReactions,
    sendReaction,
    pttEnabled,
    setPttEnabled,
    isPushToTalkActive,
    applyFaceAvatarFromSettings,
    applyVirtualBgFromSettings,
    applyNoiseSuppressionFromSettings
  ]);

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
      {/* Always-mounted audio sink: owns remote audio independent of the
          video tiles, so voice keeps playing when a tile shows the avatar,
          the filmstrip is collapsed, or only the broadcast window is open. */}
      <RemoteAudioSinks />
    </WebRTCContext.Provider>
  );
};

export default WebRTCContext;
