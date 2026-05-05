import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from 'react';
import hark from 'hark';
import SimplePeer from 'simple-peer';
import type { ReactNode } from 'react';
import { useWebcamConfig } from '../config/WebcamConfig.tsx';
import { VirtualBackgroundService, DEFAULT_BACKGROUNDS } from '../services/virtualBackgroundService';
import type { VirtualBackgroundConfig } from '../services/virtualBackgroundService';
import { AudioProcessor, DEFAULT_AUDIO_PROCESSOR_CONFIG } from '../services/audioProcessor';
import type { AudioProcessorConfig } from '../services/audioProcessor';
import { FaceAvatarService, DEFAULT_AVATAR_CONFIG } from '../services/faceAvatarService';
import type { FaceAvatarConfig } from '../services/faceAvatarService';
import {
  getICEServers,
  prefetchTurnCredentials,
  setMaxVideoBitrate,
  getVideoConstraints,
  getAudioConstraints,
  setH264CodecPreference,
  addEnhancedDiagnostics
} from '../utils/webrtcMobileFixes';

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerConnections: Map<string, SimplePeer.Instance>;
  connectionStates: Map<string, string>; // Track negotiation states per peer
  peerConnectionTypes: Map<string, string>; // Track peer connection types (video+audio, audio only, etc.)
  isWebcamActive: boolean;
  isVideoEnabled: boolean; // Whether user has enabled video chat
  isVideoPrepairing: boolean; // Whether user is in preparation mode (settings open)
  isMicrophoneMuted: boolean; // Whether microphone is muted
  connectionType: 'has-camera' | 'no-camera' | null; // Track user's connection capabilities
  availableDevices: {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  };
  selectedDevices: {
    cameraId: string;
    microphoneId: string;
  };
  virtualBackground: {
    isEnabled: boolean;
    isInitialized: boolean;
    config: VirtualBackgroundConfig;
    availableBackgrounds: Array<{ name: string; url: string }>;
  };
  audioProcessor: {
    isEnabled: boolean;
    isInitialized: boolean;
    config: AudioProcessorConfig;
  };
  faceAvatar: {
    isEnabled: boolean;
    isInitialized: boolean;
    config: FaceAvatarConfig;
  };
}

type WebRTCAction = 
  | { type: 'SET_LOCAL_STREAM'; payload: MediaStream | null }
  | { type: 'SET_WEBCAM_ACTIVE'; payload: boolean }
  | { type: 'SET_VIDEO_ENABLED'; payload: boolean }
  | { type: 'SET_VIDEO_PREPARING'; payload: boolean }
  | { type: 'SET_MICROPHONE_MUTED'; payload: boolean }
  | { type: 'SET_CONNECTION_TYPE'; payload: 'has-camera' | 'no-camera' | null }
  | { type: 'ADD_REMOTE_STREAM'; payload: { peerId: string; stream: MediaStream } }
  | { type: 'REMOVE_REMOTE_STREAM'; payload: string }
  | { type: 'ADD_PEER_CONNECTION'; payload: { peerId: string; connection: SimplePeer.Instance } }
  | { type: 'REMOVE_PEER_CONNECTION'; payload: string }
  | { type: 'SET_CONNECTION_STATE'; payload: { peerId: string; state: string } }
  | { type: 'SET_PEER_CONNECTION_TYPE'; payload: { peerId: string; connectionType: string } }
  | { type: 'SET_AVAILABLE_DEVICES'; payload: { cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] } }
  | { type: 'SET_SELECTED_DEVICE'; payload: { deviceType: 'camera' | 'microphone'; deviceId: string } }
  | { type: 'SET_VIRTUAL_BACKGROUND_ENABLED'; payload: boolean }
  | { type: 'SET_VIRTUAL_BACKGROUND_INITIALIZED'; payload: boolean }
  | { type: 'SET_VIRTUAL_BACKGROUND_CONFIG'; payload: Partial<VirtualBackgroundConfig> }
  | { type: 'SET_AUDIO_PROCESSOR_ENABLED'; payload: boolean }
  | { type: 'SET_AUDIO_PROCESSOR_INITIALIZED'; payload: boolean }
  | { type: 'SET_AUDIO_PROCESSOR_CONFIG'; payload: Partial<AudioProcessorConfig> }
  | { type: 'SET_FACE_AVATAR_ENABLED'; payload: boolean }
  | { type: 'SET_FACE_AVATAR_INITIALIZED'; payload: boolean }
  | { type: 'SET_FACE_AVATAR_CONFIG'; payload: Partial<FaceAvatarConfig> }
  | { type: 'RESET_STATE' };

const initialState: WebRTCState = {
  localStream: null,
  remoteStreams: new Map(),
  peerConnections: new Map(),
  connectionStates: new Map(),
  peerConnectionTypes: new Map(),
  isWebcamActive: false,
  isVideoEnabled: false,
  isVideoPrepairing: false,
  isMicrophoneMuted: false,
  connectionType: null,
  availableDevices: {
    cameras: [],
    microphones: []
  },
  selectedDevices: {
    cameraId: '',
    microphoneId: ''
  },
  virtualBackground: {
    isEnabled: false,
    isInitialized: false,
    config: {
      model: 'MediaPipe',
      segmentationThreshold: 0.6,
      useBlur: true,
      blurAmount: 25,
      edgeSmoothing: 3,
      temporalSmoothing: 0.7,
      maskBlur: 2,
      erosionSize: 1,
      dilationSize: 1,
      adaptiveThreshold: true,
      hairRefinement: true,
      minContourArea: 1000
    },
    availableBackgrounds: DEFAULT_BACKGROUNDS
  },
  audioProcessor: {
    isEnabled: false,
    isInitialized: false,
    config: DEFAULT_AUDIO_PROCESSOR_CONFIG
  },
  faceAvatar: {
    isEnabled: false,
    isInitialized: false,
    config: DEFAULT_AVATAR_CONFIG
  }
};

// Note: ICE servers (STUN/TURN) are now provided by getICEServers() from mobile fixes
// Audio constraints are now provided by getAudioConstraints() from mobile fixes

function webrtcReducer(state: WebRTCState, action: WebRTCAction): WebRTCState {
  switch (action.type) {
    case 'SET_LOCAL_STREAM':
      return { ...state, localStream: action.payload };
    
    case 'SET_WEBCAM_ACTIVE':
      return { ...state, isWebcamActive: action.payload };
    
    case 'SET_VIDEO_ENABLED':
      return { ...state, isVideoEnabled: action.payload };
    
    case 'SET_VIDEO_PREPARING':
      return { ...state, isVideoPrepairing: action.payload };
    
    case 'SET_MICROPHONE_MUTED':
      return { ...state, isMicrophoneMuted: action.payload };
    
    case 'SET_CONNECTION_TYPE':
      return { ...state, connectionType: action.payload };
    
    case 'ADD_REMOTE_STREAM':
      const newRemoteStreams = new Map(state.remoteStreams);
      newRemoteStreams.set(action.payload.peerId, action.payload.stream);
      return { ...state, remoteStreams: newRemoteStreams };
    
    case 'REMOVE_REMOTE_STREAM':
      const updatedRemoteStreams = new Map(state.remoteStreams);
      updatedRemoteStreams.delete(action.payload);
      return { ...state, remoteStreams: updatedRemoteStreams };
    
    case 'ADD_PEER_CONNECTION':
      const newConnections = new Map(state.peerConnections);
      newConnections.set(action.payload.peerId, action.payload.connection);
      return { ...state, peerConnections: newConnections };
    
    case 'REMOVE_PEER_CONNECTION':
      const updatedConnections = new Map(state.peerConnections);
      const updatedStates = new Map(state.connectionStates);
      const updatedConnectionTypes = new Map(state.peerConnectionTypes);
      const connection = updatedConnections.get(action.payload);
      if (connection) {
        try { connection.destroy(); } catch { /* noop */ }
        updatedConnections.delete(action.payload);
      }
      updatedStates.delete(action.payload);
      updatedConnectionTypes.delete(action.payload);
      return { ...state, peerConnections: updatedConnections, connectionStates: updatedStates, peerConnectionTypes: updatedConnectionTypes };
    
    case 'SET_CONNECTION_STATE':
      const newConnectionStates = new Map(state.connectionStates);
      newConnectionStates.set(action.payload.peerId, action.payload.state);
      return { ...state, connectionStates: newConnectionStates };
    
    case 'SET_PEER_CONNECTION_TYPE':
      const newPeerConnectionTypes = new Map(state.peerConnectionTypes);
      newPeerConnectionTypes.set(action.payload.peerId, action.payload.connectionType);
      return { ...state, peerConnectionTypes: newPeerConnectionTypes };
    
    case 'SET_AVAILABLE_DEVICES':
      return { ...state, availableDevices: action.payload };
    
    case 'SET_SELECTED_DEVICE':
      const updatedSelectedDevices = { ...state.selectedDevices };
      if (action.payload.deviceType === 'camera') {
        updatedSelectedDevices.cameraId = action.payload.deviceId;
      } else {
        updatedSelectedDevices.microphoneId = action.payload.deviceId;
      }
      return { ...state, selectedDevices: updatedSelectedDevices };
    
    case 'SET_VIRTUAL_BACKGROUND_ENABLED':
      return { 
        ...state, 
        virtualBackground: { 
          ...state.virtualBackground, 
          isEnabled: action.payload 
        } 
      };
    
    case 'SET_VIRTUAL_BACKGROUND_INITIALIZED':
      return { 
        ...state, 
        virtualBackground: { 
          ...state.virtualBackground, 
          isInitialized: action.payload 
        } 
      };
    
    case 'SET_VIRTUAL_BACKGROUND_CONFIG':
      return { 
        ...state, 
        virtualBackground: { 
          ...state.virtualBackground, 
          config: { ...state.virtualBackground.config, ...action.payload } 
        } 
      };
    
    case 'SET_AUDIO_PROCESSOR_ENABLED':
      return { 
        ...state, 
        audioProcessor: { 
          ...state.audioProcessor, 
          isEnabled: action.payload 
        } 
      };
    
    case 'SET_AUDIO_PROCESSOR_INITIALIZED':
      return { 
        ...state, 
        audioProcessor: { 
          ...state.audioProcessor, 
          isInitialized: action.payload 
        } 
      };
    
    case 'SET_AUDIO_PROCESSOR_CONFIG':
      return { 
        ...state, 
        audioProcessor: { 
          ...state.audioProcessor, 
          config: { ...state.audioProcessor.config, ...action.payload } 
        } 
      };
    
    case 'SET_FACE_AVATAR_ENABLED':
      return { 
        ...state, 
        faceAvatar: { 
          ...state.faceAvatar, 
          isEnabled: action.payload 
        } 
      };
    
    case 'SET_FACE_AVATAR_INITIALIZED':
      return { 
        ...state, 
        faceAvatar: { 
          ...state.faceAvatar, 
          isInitialized: action.payload 
        } 
      };
    
    case 'SET_FACE_AVATAR_CONFIG':
      return { 
        ...state, 
        faceAvatar: { 
          ...state.faceAvatar, 
          config: { ...state.faceAvatar.config, ...action.payload } 
        } 
      };
    
    case 'RESET_STATE':
      state.peerConnections.forEach(connection => {
        try { connection.destroy(); } catch { /* noop */ }
      });
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }
      return { ...initialState };
    
    default:
      return state;
  }
}

// Helper function to get high-quality audio constraints
const getHighQualityAudioConstraints = (deviceId?: string): MediaTrackConstraints => {
  const baseConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,  // Disable to maintain natural voice levels
  };

  if (deviceId) {
    return {
      ...baseConstraints,
      deviceId: { exact: deviceId }
    };
  }

  return baseConstraints;
};

// hark sensitivity. -65dB picks up normal speech without triggering on keyboard taps.
const HARK_THRESHOLD = -65;
const HARK_INTERVAL = 100;

interface WebRTCContextState extends Omit<WebRTCState, 'availableDevices'> {
  // Active speakers — peer IDs whose mic level is currently above threshold.
  // Includes own socket id when local mic is hot.
  speakingPeers: Set<string>;
  isLocalSpeaking: boolean;
  enableVideoChat: () => Promise<void>;
  prepareVideoChat: () => Promise<void>;
  confirmVideoChat: () => Promise<void>;
  cancelVideoPreparation: () => void;
  disableVideoChat: () => void;
  toggleWebcam: () => void;
  toggleMicrophone: () => void;
  refreshConnections: () => void;
  setSelectedCamera: (deviceId: string) => void;
  setSelectedMicrophone: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  initializeVirtualBackground: () => Promise<void>;
  enableVirtualBackground: () => Promise<void>;
  disableVirtualBackground: () => void;
  updateVirtualBackgroundConfig: (config: Partial<VirtualBackgroundConfig>) => void;
  initializeAudioProcessor: () => Promise<void>;
  enableAudioProcessor: () => Promise<void>;
  disableAudioProcessor: () => void;
  updateAudioProcessorConfig: (config: Partial<AudioProcessorConfig>) => void;
  initializeFaceAvatar: () => Promise<void>;
  enableFaceAvatar: () => Promise<void>;
  disableFaceAvatar: () => void;
  updateFaceAvatarConfig: (config: Partial<FaceAvatarConfig>) => void;
  // Soundbite-compatible aliases
  isAudioEnabled: boolean;
  isCameraEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  connectionError: string | null;
  availableDevices: MediaDeviceInfo[];
}

const WebRTCContext = createContext<WebRTCContextState | undefined>(undefined);

export const useWebRTC = (): WebRTCContextState => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

interface WebRTCProviderProps {
  children: ReactNode;
}

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(webrtcReducer, initialState);

  // Get configuration from adapter
  const config = useWebcamConfig();
  const roomCode = config.getRoomCode();
  const socket = config.getSocket();
  const userId = config.getUserId();
  
  // Use refs to store current state for callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // Active-speaker detection (hark) — kept separate from the reducer so we
  // don't have to thread it through every dispatch site.
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const harksRef = useRef<Map<string, hark.Harker>>(new Map());
  const localHarkRef = useRef<hark.Harker | null>(null);

  const addSpeaker = useCallback((id: string) => {
    setSpeakingPeers(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const removeSpeaker = useCallback((id: string) => {
    setSpeakingPeers(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  const stopHark = useCallback((peerId: string) => {
    const speech = harksRef.current.get(peerId);
    if (speech) {
      try { speech.stop(); } catch { /* noop */ }
      harksRef.current.delete(peerId);
    }
    removeSpeaker(peerId);
  }, [removeSpeaker]);
  const attachHark = useCallback((peerId: string, stream: MediaStream) => {
    if (!stream.getAudioTracks().length) return;
    stopHark(peerId);
    try {
      const speech = hark(stream, { interval: HARK_INTERVAL, threshold: HARK_THRESHOLD, play: false });
      speech.on('speaking', () => addSpeaker(peerId));
      speech.on('stopped_speaking', () => removeSpeaker(peerId));
      harksRef.current.set(peerId, speech);
    } catch (err) {
      console.error(`[WebRTC] Failed to attach hark for ${peerId}:`, err);
    }
  }, [addSpeaker, removeSpeaker, stopHark]);
  
  // simple-peer handles ICE-candidate queueing internally — no manual pending store needed.
  // Track peers who have enabled video (even before we enable ours)
  const videoPeersRef = useRef<Set<string>>(new Set());

  // simple-peer keeps the underlying RTCPeerConnection on `_pc` (private but stable across versions).
  // Used by the camera/mic/virtualBg/audioProcessor/faceAvatar code paths that need direct
  // access to senders for `replaceTrack`.
  const pcOf = (peer: SimplePeer.Instance): RTCPeerConnection | undefined =>
    (peer as unknown as { _pc?: RTCPeerConnection })._pc;

  const createPeerConnection = useCallback((peerId: string, initiator: boolean): SimplePeer.Instance => {
    console.log(`[WebRTC] Creating peer connection for ${peerId} (initiator=${initiator})`);

    // Reuse if already alive
    const existing = stateRef.current.peerConnections.get(peerId);
    if (existing && !existing.destroyed) {
      console.log(`[WebRTC] Reusing existing connection to ${peerId}`);
      return existing;
    }
    if (existing && existing.destroyed) {
      try { existing.destroy(); } catch { /* noop */ }
    }

    dispatch({ type: 'SET_CONNECTION_STATE', payload: { peerId, state: 'new' } });

    const localStream = stateRef.current.localStream;
    const peer = new SimplePeer({
      initiator,
      stream: localStream ?? undefined,
      trickle: true,
      config: {
        iceServers: getICEServers(),
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      }
    });

    // Mobile-specific RTCPeerConnection tweaks (simple-peer keeps the underlying pc on _pc)
    const pc = pcOf(peer);
    if (pc) {
      setH264CodecPreference(pc, peerId);
      addEnhancedDiagnostics(pc, peerId);
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
    });

    peer.on('stream', (stream: MediaStream) => {
      console.log(`[WebRTC] Received remote stream from ${peerId}`);
      dispatch({ type: 'ADD_REMOTE_STREAM', payload: { peerId, stream } });
    });

    peer.on('track', (_track: MediaStreamTrack, stream: MediaStream) => {
      // Defensive: some browsers fire 'track' without a follow-up 'stream'.
      dispatch({ type: 'ADD_REMOTE_STREAM', payload: { peerId, stream } });
    });

    peer.on('connect', () => {
      console.log(`[WebRTC] Successfully connected to ${peerId}!`);
      dispatch({ type: 'SET_CONNECTION_STATE', payload: { peerId, state: 'connected' } });
      const pcInner = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
      if (pcInner) setMaxVideoBitrate(pcInner, 350).catch(() => { /* noop */ });
    });

    peer.on('close', () => {
      console.log(`[WebRTC] Connection to ${peerId} closed`);
      dispatch({ type: 'REMOVE_REMOTE_STREAM', payload: peerId });
      dispatch({ type: 'REMOVE_PEER_CONNECTION', payload: peerId });
    });

    peer.on('error', (err: Error) => {
      console.error(`[WebRTC] Peer error for ${peerId}:`, err);
      dispatch({ type: 'REMOVE_REMOTE_STREAM', payload: peerId });
      dispatch({ type: 'REMOVE_PEER_CONNECTION', payload: peerId });
    });

    dispatch({ type: 'ADD_PEER_CONNECTION', payload: { peerId, connection: peer } });

    return peer;
  }, [socket, roomCode]);

  const createOffer = useCallback(async (peerId: string) => {
    // simple-peer auto-creates and sends the offer via 'signal' when initiator=true.
    console.log(`[WebRTC] Initiating peer connection (will offer) for ${peerId}`);
    dispatch({ type: 'SET_CONNECTION_STATE', payload: { peerId, state: 'offer-sent' } });
    createPeerConnection(peerId, true);
  }, [createPeerConnection]);

  const enableVideoChat = useCallback(async () => {
    try {
      console.log('[WebRTC] Enabling video chat...');
      
      let stream: MediaStream | null = null;
      let hasVideo = false;
      let hasAudio = false;
      let connectionType = '';

      // Try different permission combinations, starting with both video and audio
      try {
        // First attempt: Both video and audio
        console.log('[WebRTC] Attempting video + audio...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(state.selectedDevices.cameraId || undefined),
          audio: getAudioConstraints(state.selectedDevices.microphoneId || undefined)
        });
        hasVideo = stream.getVideoTracks().length > 0;
        hasAudio = stream.getAudioTracks().length > 0;
        connectionType = 'has-camera';
        console.log('[WebRTC] Success: Video + Audio enabled');
      } catch (videoAudioError) {
        console.log('[WebRTC] Video + Audio failed, trying audio only...', videoAudioError);
        
        try {
          // Second attempt: Audio only
          stream = await navigator.mediaDevices.getUserMedia({
            audio: getAudioConstraints(state.selectedDevices.microphoneId || undefined)
          });
          hasVideo = false;
          hasAudio = stream.getAudioTracks().length > 0;
          connectionType = 'no-camera';
          console.log('[WebRTC] Success: Audio-only enabled (no camera available)');
        } catch (audioError) {
          console.log('[WebRTC] Audio failed, trying video only...', audioError);
          
          try {
            // Third attempt: Video only
            stream = await navigator.mediaDevices.getUserMedia({
              video: getVideoConstraints(state.selectedDevices.cameraId || undefined)
            });
            hasVideo = stream.getVideoTracks().length > 0;
            hasAudio = false;
            connectionType = 'has-camera';
            console.log('[WebRTC] Success: Video-only enabled');
          } catch (videoError) {
            console.log('[WebRTC] All media access failed, enabling view-only mode...', videoError);
            
            // Fourth attempt: No media (view-only mode) - create fake stream for WebRTC compatibility
            console.log('[WebRTC] Creating fake stream for view-only mode...');
            try {
              // Create empty audio context and silent audio track for WebRTC compatibility
              const audioContext = new AudioContext();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              // Create a silent audio track
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              gainNode.gain.value = 0; // Silent
              oscillator.frequency.value = 440;
              oscillator.start();
              
              // Create MediaStreamDestination to get a MediaStream
              const destination = audioContext.createMediaStreamDestination();
              gainNode.connect(destination);
              
              stream = destination.stream;
              hasVideo = false;
              hasAudio = true; // We have a silent audio track
              connectionType = 'no-camera';
              console.log('[WebRTC] Success: View-only mode with fake stream created');
            } catch (emptyStreamError) {
              console.log('[WebRTC] Failed to create fake stream, going truly streamless...', emptyStreamError);
              stream = null;
              hasVideo = false;
              hasAudio = false;
              connectionType = 'no-camera';
              console.log('[WebRTC] Success: View-only mode enabled (no camera available)');
            }
          }
        }
      }

      // Configure initial states based on what we got
      if (stream) {
        // Start with microphone muted if we have audio
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = false;
        });
      }
      
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
      dispatch({ type: 'SET_WEBCAM_ACTIVE', payload: hasVideo });
      dispatch({ type: 'SET_VIDEO_ENABLED', payload: true });
      dispatch({ type: 'SET_MICROPHONE_MUTED', payload: !hasAudio || true }); // Start muted if we have audio
      dispatch({ type: 'SET_CONNECTION_TYPE', payload: connectionType as 'has-camera' | 'no-camera' });
      
      // Notify server that we're ready for video and send our connection type
      if (socket && roomCode) {
        socket.emit('webrtc:enable-video', {
          roomCode,
          peerId: userId,
          connectionType: connectionType
        });

        // Late-joiner sync: ask server who is already in video chat so we can
        // initiate offers to anyone we missed before our local stream was ready.
        socket.emit('webrtc:get-active-peers', { roomCode });

        // Re-announce after 2s to catch peers whose join happened in the same tick.
        setTimeout(() => {
          if (socket.connected) {
            socket.emit('webrtc:enable-video', {
              roomCode,
              peerId: userId,
              connectionType: connectionType
            });
          }
        }, 2000);
      }

      // Show user what type of connection they have
      const statusMessage = `Video chat enabled (${connectionType})${!hasVideo ? ' - You can see others but your camera is not available' : ''}${!hasAudio ? ' - Audio not available' : ''}`;
      console.log(`[WebRTC] ${statusMessage}`);
      
      // Show a toast notification for no-camera users
      if (connectionType === 'no-camera') {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.textContent = hasAudio ? 
          '🎤 Voice-only mode: You can hear others but no camera available' :
          '👀 View-only mode: You can see others but no camera/mic available';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      }
      
    } catch (error) {
      console.error('[WebRTC] Error enabling video chat:', error);
      // Even if everything fails, we should still allow joining to see others
      dispatch({ type: 'SET_LOCAL_STREAM', payload: null });
      dispatch({ type: 'SET_WEBCAM_ACTIVE', payload: false });
      dispatch({ type: 'SET_VIDEO_ENABLED', payload: true });
      dispatch({ type: 'SET_MICROPHONE_MUTED', payload: true });
      dispatch({ type: 'SET_CONNECTION_TYPE', payload: 'no-camera' });
      
      if (socket && roomCode) {
        socket.emit('webrtc:enable-video', { 
          roomCode, 
          peerId: userId, 
          connectionType: 'no-camera' 
        });
      }
      
      alert('Could not access camera or microphone, but you can still see other players. Check your browser permissions if you want to share your camera/microphone.');
    }
  }, [socket, roomCode, userId, state.selectedDevices.cameraId, state.selectedDevices.microphoneId]);

  const prepareVideoChat = useCallback(async () => {
    try {
      console.log('[WebRTC] Preparing video chat (local preview only)...');
      
      let stream: MediaStream | null = null;
      let hasVideo = false;
      let connectionType = '';

      // Try different permission combinations, starting with both video and audio
      try {
        // First attempt: Both video and audio
        console.log('[WebRTC] Attempting video + audio...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(state.selectedDevices.cameraId || undefined),
          audio: getAudioConstraints(state.selectedDevices.microphoneId || undefined)
        });
        hasVideo = stream.getVideoTracks().length > 0;
        connectionType = 'has-camera';
        console.log('[WebRTC] Success: Video + Audio prepared');
      } catch (videoAudioError) {
        console.log('[WebRTC] Video + Audio failed, trying audio only...', videoAudioError);
        
        try {
          // Second attempt: Audio only
          stream = await navigator.mediaDevices.getUserMedia({
            audio: getAudioConstraints(state.selectedDevices.microphoneId || undefined)
          });
          hasVideo = false;
          connectionType = 'no-camera';
          console.log('[WebRTC] Success: Audio-only prepared (no camera available)');
        } catch (audioError) {
          console.log('[WebRTC] Audio failed, trying video only...', audioError);
          
          try {
            // Third attempt: Video only
            stream = await navigator.mediaDevices.getUserMedia({
              video: getVideoConstraints(state.selectedDevices.cameraId || undefined)
            });
            hasVideo = stream.getVideoTracks().length > 0;
            connectionType = 'has-camera';
            console.log('[WebRTC] Success: Video-only prepared');
          } catch (videoError) {
            console.log('[WebRTC] All media access failed, preparing view-only mode...', videoError);
            stream = null;
            hasVideo = false;
            connectionType = 'no-camera';
            console.log('[WebRTC] Success: View-only mode prepared');
          }
        }
      }

      // Configure initial states - keep muted in preparation mode
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = false; // Keep muted during preparation
        });
      }
      
      // Set state for preparation mode (but don't notify server yet)
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
      dispatch({ type: 'SET_WEBCAM_ACTIVE', payload: hasVideo });
      dispatch({ type: 'SET_VIDEO_PREPARING', payload: true });
      dispatch({ type: 'SET_MICROPHONE_MUTED', payload: true }); // Always start muted in preparation
      dispatch({ type: 'SET_CONNECTION_TYPE', payload: connectionType as 'has-camera' | 'no-camera' });
      
      console.log(`[WebRTC] Video chat prepared for preview (${connectionType})`);
      
    } catch (error) {
      console.error('[WebRTC] Error preparing video chat:', error);
      // Set basic states even if preparation fails
      dispatch({ type: 'SET_LOCAL_STREAM', payload: null });
      dispatch({ type: 'SET_WEBCAM_ACTIVE', payload: false });
      dispatch({ type: 'SET_VIDEO_PREPARING', payload: true });
      dispatch({ type: 'SET_MICROPHONE_MUTED', payload: true });
      dispatch({ type: 'SET_CONNECTION_TYPE', payload: 'no-camera' });
    }
  }, [state.selectedDevices.cameraId, state.selectedDevices.microphoneId]);

  const confirmVideoChat = useCallback(async () => {
    try {
      console.log('[WebRTC] Confirming video chat - making visible to other players...');
      
      // Exit preparation mode and enable video chat
      dispatch({ type: 'SET_VIDEO_PREPARING', payload: false });
      dispatch({ type: 'SET_VIDEO_ENABLED', payload: true });
      
      // Notify server that we're ready for video and send our connection type
      if (socket && roomCode && state.connectionType) {
        socket.emit('webrtc:enable-video', { 
          roomCode, 
          peerId: userId, 
          connectionType: state.connectionType 
        });
      }
      
      console.log('[WebRTC] Video chat confirmed and enabled for other players');
      
    } catch (error) {
      console.error('[WebRTC] Error confirming video chat:', error);
    }
  }, [socket, roomCode, userId, state.connectionType]);

  const cancelVideoPreparation = useCallback(() => {
    console.log('[WebRTC] Canceling video preparation...');
    
    // Stop the local stream if it exists
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    
    // Reset preparation state
    dispatch({ type: 'SET_LOCAL_STREAM', payload: null });
    dispatch({ type: 'SET_WEBCAM_ACTIVE', payload: false });
    dispatch({ type: 'SET_VIDEO_PREPARING', payload: false });
    dispatch({ type: 'SET_MICROPHONE_MUTED', payload: false });
    dispatch({ type: 'SET_CONNECTION_TYPE', payload: null });
    
    console.log('[WebRTC] Video preparation canceled');
  }, [state.localStream]);

  const disableVideoChat = useCallback(async () => {
    console.log('[WebRTC] Disabling video chat');

    // Stop virtual background service if active - await disposal to prevent race conditions
    if (virtualBackgroundService.current) {
      console.log('[WebRTC] Disposing virtual background service...');
      const service = virtualBackgroundService.current;
      virtualBackgroundService.current = null; // Prevent double-dispose
      try {
        await service.dispose();
      } catch (err) {
        console.warn('[WebRTC] Error disposing virtual background service:', err);
      }
    }

    // Stop audio processor service if active - await disposal to prevent race conditions
    if (audioProcessorService.current) {
      console.log('[WebRTC] Disposing audio processor service...');
      const service = audioProcessorService.current;
      audioProcessorService.current = null; // Prevent double-dispose
      try {
        await service.dispose();
      } catch (err) {
        console.warn('[WebRTC] Error disposing audio processor service:', err);
      }
    }

    // Notify server that we're disabling video
    if (socket && roomCode) {
      socket.emit('webrtc:disable-video', { roomCode, peerId: userId });
    }

    dispatch({ type: 'SET_VIDEO_ENABLED', payload: false });
    videoPeersRef.current.clear();
    dispatch({ type: 'RESET_STATE' });
  }, [socket, roomCode, userId]);

  const toggleWebcam = useCallback(async () => {
    if (!state.localStream) {
      console.log('[WebRTC] Cannot toggle webcam - no local stream available');
      return;
    }

    const videoTracks = state.localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.log('[WebRTC] Cannot toggle webcam - no video tracks available');
      return;
    }

    const newState = !state.isWebcamActive;

    if (newState) {
      // Turning camera ON - create a completely new stream
      console.log('[WebRTC] Turning camera on - creating new stream with fresh video track');
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: state.selectedDevices.cameraId ? {
            deviceId: { exact: state.selectedDevices.cameraId },
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 }
          } : {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 }
          }
        });

        const newVideoTrack = videoStream.getVideoTracks()[0];
        const audioTracks = state.localStream.getAudioTracks();

        // Stop old video tracks
        videoTracks.forEach(track => track.stop());

        // Create a NEW MediaStream with the new video track and existing audio tracks
        const newStream = new MediaStream();
        newStream.addTrack(newVideoTrack);
        audioTracks.forEach(track => newStream.addTrack(track));

        console.log('[WebRTC] New stream created with fresh video track');

        // Update all peer connections with the new video track
        state.peerConnections.forEach((peerConnection) => {
          const sender = pcOf(peerConnection)?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack).catch(err => {
              console.error('[WebRTC] Failed to replace video track:', err);
            });
          }
        });

        // Update the local stream (this will trigger React re-render)
        dispatch({ type: 'SET_LOCAL_STREAM', payload: newStream });

        console.log('[WebRTC] Camera turned on with fresh video track');
      } catch (error) {
        console.error('[WebRTC] Failed to turn on camera:', error);
        return;
      }
    } else {
      // Turning camera OFF - just disable the track
      console.log('[WebRTC] Turning camera off');
      videoTracks.forEach(track => {
        track.enabled = false;
      });
    }

    dispatch({ type: 'SET_WEBCAM_ACTIVE', payload: newState });
  }, [state.localStream, state.isWebcamActive, state.selectedDevices.cameraId, state.peerConnections]);

  const toggleMicrophone = useCallback(() => {
    if (!state.localStream) {
      console.log('[WebRTC] Cannot toggle microphone - no local stream available');
      return;
    }
    
    const audioTracks = state.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log('[WebRTC] Cannot toggle microphone - no audio tracks available');
      return;
    }
    
    const newState = !state.isMicrophoneMuted;
    
    audioTracks.forEach(track => {
      track.enabled = !newState; // enabled is opposite of muted
    });
    
    dispatch({ type: 'SET_MICROPHONE_MUTED', payload: newState });
    console.log(`[WebRTC] Microphone ${newState ? 'muted' : 'unmuted'}`);
  }, [state.localStream, state.isMicrophoneMuted]);

  const refreshConnections = useCallback(() => {
    console.log('[WebRTC] Refreshing connections...');
    
    // If video is enabled, request updated peer list from server
    if (state.isVideoEnabled && socket && roomCode) {
      // Close existing connections
      state.peerConnections.forEach((connection, peerId) => {
        console.log(`[WebRTC] Closing connection to ${peerId} for refresh`);
        try { connection.destroy(); } catch { /* noop */ }
        dispatch({ type: 'REMOVE_PEER_CONNECTION', payload: peerId });
      });
      
      // Clear remote streams but keep local stream and video enabled state
      state.remoteStreams.clear();
      
      // Request fresh peer list without resetting everything
      setTimeout(() => {
        if (!socket) return;
        console.log('[WebRTC] Requesting fresh peer list');
        socket.emit('webrtc:enable-video', { roomCode, peerId: userId });
      }, 200);
    }
  }, [state.isVideoEnabled, state.peerConnections, state.remoteStreams, socket, roomCode, userId]);

  // Device management functions
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      dispatch({ type: 'SET_AVAILABLE_DEVICES', payload: { cameras, microphones } });
      
      // Set default devices if none selected
      if (!state.selectedDevices.cameraId && cameras.length > 0) {
        dispatch({ type: 'SET_SELECTED_DEVICE', payload: { deviceType: 'camera', deviceId: cameras[0].deviceId } });
      }
      if (!state.selectedDevices.microphoneId && microphones.length > 0) {
        dispatch({ type: 'SET_SELECTED_DEVICE', payload: { deviceType: 'microphone', deviceId: microphones[0].deviceId } });
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  }, [state.selectedDevices.cameraId, state.selectedDevices.microphoneId]);

  const setSelectedCamera = useCallback((deviceId: string) => {
    dispatch({ type: 'SET_SELECTED_DEVICE', payload: { deviceType: 'camera', deviceId } });
    
    // If stream exists (during preparation or active call), restart with new camera
    if (state.localStream) {
      setTimeout(async () => {
        try {
          // Stop current stream
          state.localStream?.getTracks().forEach(track => track.stop());

          // Create new stream with selected camera
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 24, max: 30 }
            },
            audio: getHighQualityAudioConstraints(state.selectedDevices.microphoneId || undefined)
          });

          // Apply current mute states
          const audioTracks = stream.getAudioTracks();
          const videoTracks = stream.getVideoTracks();

          audioTracks.forEach(track => {
            track.enabled = !state.isMicrophoneMuted;
          });

          videoTracks.forEach(track => {
            track.enabled = state.isWebcamActive;
          });

          dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });

          // Update all peer connections with new stream (only if any exist)
          state.peerConnections.forEach(async (peer) => {
            const senders = pcOf(peer)?.getSenders() ?? [];

            // Replace video track
            const videoSender = senders.find(s => s.track?.kind === 'video');
            const newVideoTrack = stream.getVideoTracks()[0];
            if (videoSender && newVideoTrack) {
              await videoSender.replaceTrack(newVideoTrack);
            }

            // Replace audio track if microphone also changed
            const audioSender = senders.find(s => s.track?.kind === 'audio');
            const newAudioTrack = stream.getAudioTracks()[0];
            if (audioSender && newAudioTrack) {
              await audioSender.replaceTrack(newAudioTrack);
            }
          });

          console.log('[WebRTC] Camera changed successfully');
        } catch (error) {
          console.error('[WebRTC] Error changing camera:', error);
        }
      }, 100);
    }
  }, [state.localStream, state.selectedDevices.microphoneId, state.isMicrophoneMuted, state.isWebcamActive, state.peerConnections]);

  const setSelectedMicrophone = useCallback((deviceId: string) => {
    dispatch({ type: 'SET_SELECTED_DEVICE', payload: { deviceType: 'microphone', deviceId } });
    
    // If stream exists (during preparation or active call), restart with new microphone
    if (state.localStream) {
      setTimeout(async () => {
        try {
          // Stop current stream
          state.localStream?.getTracks().forEach(track => track.stop());

          // Create new stream with selected microphone
          const stream = await navigator.mediaDevices.getUserMedia({
            video: state.selectedDevices.cameraId ? {
              deviceId: { exact: state.selectedDevices.cameraId },
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 24, max: 30 }
            } : {
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 24, max: 30 }
            },
            audio: getHighQualityAudioConstraints(deviceId)
          });

          // Apply current mute states
          const audioTracks = stream.getAudioTracks();
          const videoTracks = stream.getVideoTracks();

          audioTracks.forEach(track => {
            track.enabled = !state.isMicrophoneMuted;
          });

          videoTracks.forEach(track => {
            track.enabled = state.isWebcamActive;
          });

          dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });

          // Update all peer connections with new stream (only if any exist)
          state.peerConnections.forEach(async (peer) => {
            const senders = pcOf(peer)?.getSenders() ?? [];

            // Replace audio track
            const audioSender = senders.find(s => s.track?.kind === 'audio');
            const newAudioTrack = stream.getAudioTracks()[0];
            if (audioSender && newAudioTrack) {
              await audioSender.replaceTrack(newAudioTrack);
            }

            // Replace video track
            const videoSender = senders.find(s => s.track?.kind === 'video');
            const newVideoTrack = stream.getVideoTracks()[0];
            if (videoSender && newVideoTrack) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          });

          console.log('[WebRTC] Microphone changed successfully');
        } catch (error) {
          console.error('[WebRTC] Error changing microphone:', error);
        }
      }, 100);
    }
  }, [state.localStream, state.selectedDevices.cameraId, state.isMicrophoneMuted, state.isWebcamActive, state.peerConnections]);

  // Pre-fetch Cloudflare TURN credentials (sync from cache, refresh in bg)
  useEffect(() => {
    prefetchTurnCredentials().catch(() => { /* logged inside */ });
  }, []);

  // Socket event handlers for WebRTC signaling
  useEffect(() => {
    if (!socket || !roomCode || typeof socket.on !== 'function') return;

    const handlePeerEnabledVideo = ({ peerId, connectionType }: { peerId: string; connectionType?: string }) => {
      console.log('[WebRTC] Peer enabled video:', peerId, 'connectionType:', connectionType);

      if (peerId === userId) return; // Only skip self

      // Always track this peer as having video enabled
      videoPeersRef.current.add(peerId);

      if (connectionType) {
        dispatch({ type: 'SET_PEER_CONNECTION_TYPE', payload: { peerId, connectionType } });
      }

      // Only try to connect if we have video enabled and a local stream
      if (!stateRef.current.isVideoEnabled || !stateRef.current.localStream) {
        console.log('[WebRTC] Not ready yet, will connect to', peerId, 'when we enable video');
        return;
      }

      const shouldInitiate = userId && userId < peerId;
      if (shouldInitiate) {
        const hasConnection = stateRef.current.peerConnections.has(peerId);
        const connectionState = stateRef.current.connectionStates.get(peerId);
        if (!hasConnection || connectionState === 'failed') {
          setTimeout(() => createOffer(peerId), 100);
        }
      }
    };

    const handlePeerDisabledVideo = ({ peerId }: { peerId: string }) => {
      console.log('[WebRTC] Peer disabled video:', peerId);
      dispatch({ type: 'REMOVE_REMOTE_STREAM', payload: peerId });
      dispatch({ type: 'REMOVE_PEER_CONNECTION', payload: peerId });
      videoPeersRef.current.delete(peerId);
    };

    const handlePeerLeft = ({ peerId }: { peerId: string }) => {
      console.log('[WebRTC] Peer left:', peerId);
      dispatch({ type: 'REMOVE_REMOTE_STREAM', payload: peerId });
      dispatch({ type: 'REMOVE_PEER_CONNECTION', payload: peerId });
      videoPeersRef.current.delete(peerId);
    };

    // Handle peer reconnection - socket ID changed, need to re-establish WebRTC
    const handlePeerReconnected = ({ oldPeerId, newPeerId, playerName }: {
      oldPeerId: string;
      newPeerId: string;
      playerId: string;
      playerName: string;
    }) => {
      console.log(`[WebRTC] Peer reconnected: ${playerName} (${oldPeerId} → ${newPeerId})`);

      // Clean up old peer connection
      const oldConnection = stateRef.current.peerConnections.get(oldPeerId);
      if (oldConnection) {
        console.log('[WebRTC] Closing old peer connection:', oldPeerId);
        try { oldConnection.destroy(); } catch { /* noop */ }
        dispatch({ type: 'REMOVE_PEER_CONNECTION', payload: oldPeerId });
      }

      // Remove old remote stream
      dispatch({ type: 'REMOVE_REMOTE_STREAM', payload: oldPeerId });

      // If we have video enabled, initiate connection to the new peer ID
      if (stateRef.current.isVideoEnabled && stateRef.current.localStream) {
        console.log('[WebRTC] Initiating connection to reconnected peer:', newPeerId);
        // Small delay to allow the reconnected peer to set up
        setTimeout(() => {
          if (stateRef.current.isVideoEnabled) {
            createOffer(newPeerId);
          }
        }, 500);
      }
    };

    const handleOffer = ({ fromPeerId, offer }: { fromPeerId: string; offer: SimplePeer.SignalData }) => {
      console.log('[WebRTC] Received offer from:', fromPeerId);
      let peer = stateRef.current.peerConnections.get(fromPeerId);
      if (!peer || peer.destroyed) {
        peer = createPeerConnection(fromPeerId, false);
      }
      dispatch({ type: 'SET_CONNECTION_STATE', payload: { peerId: fromPeerId, state: 'answering' } });
      try {
        peer.signal(offer);
      } catch (err) {
        console.error('[WebRTC] Error applying offer:', err);
        dispatch({ type: 'SET_CONNECTION_STATE', payload: { peerId: fromPeerId, state: 'failed' } });
      }
    };

    const handleAnswer = ({ fromPeerId, answer }: { fromPeerId: string; answer: SimplePeer.SignalData }) => {
      console.log('[WebRTC] Received answer from:', fromPeerId);
      const peer = stateRef.current.peerConnections.get(fromPeerId);
      if (!peer || peer.destroyed) {
        console.warn(`[WebRTC] No live peer for ${fromPeerId} when handling answer`);
        return;
      }
      dispatch({ type: 'SET_CONNECTION_STATE', payload: { peerId: fromPeerId, state: 'answer-received' } });
      try {
        peer.signal(answer);
      } catch (err) {
        console.error('[WebRTC] Error applying answer:', err);
        dispatch({ type: 'SET_CONNECTION_STATE', payload: { peerId: fromPeerId, state: 'failed' } });
      }
    };

    const handleIceCandidate = ({ fromPeerId, candidate }: { fromPeerId: string; candidate: RTCIceCandidateInit }) => {
      const peer = stateRef.current.peerConnections.get(fromPeerId);
      if (!peer || peer.destroyed) {
        // simple-peer queues internally; drop orphan ICE candidates that arrive before the offer.
        return;
      }
      try {
        peer.signal({ candidate } as SimplePeer.SignalData);
      } catch (err) {
        console.error('[WebRTC] Error applying ICE candidate:', err);
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
    socket.on('webrtc:peer-left', handlePeerLeft);
    socket.on('webrtc:peer-reconnected', handlePeerReconnected);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:active-peers', handleActivePeers);

    return () => {
      if (!socket) return;
      socket.off('webrtc:peer-enabled-video', handlePeerEnabledVideo);
      socket.off('webrtc:peer-disabled-video', handlePeerDisabledVideo);
      socket.off('webrtc:peer-left', handlePeerLeft);
      socket.off('webrtc:peer-reconnected', handlePeerReconnected);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:active-peers', handleActivePeers);
      videoPeersRef.current.clear();
    };
  }, [socket, roomCode, userId, createPeerConnection, createOffer]);

  // Connect to known video peers when we enable video
  useEffect(() => {
    if (!socket || !state.isVideoEnabled || !state.localStream) return;

    console.log('[WebRTC] Checking for known video peers:', videoPeersRef.current.size);

    for (const peerId of videoPeersRef.current) {
      if (peerId === userId) continue;

      const hasConnection = stateRef.current.peerConnections.has(peerId);
      const connectionState = stateRef.current.connectionStates.get(peerId);

      if (!hasConnection || connectionState === 'failed') {
        const shouldInitiate = userId && userId < peerId;
        console.log(`[WebRTC] Known peer ${peerId}: shouldInitiate=${shouldInitiate}`);

        if (shouldInitiate) {
          const delay = Math.random() * 500;
          setTimeout(() => {
            if (!stateRef.current.peerConnections.has(peerId) ||
                stateRef.current.connectionStates.get(peerId) === 'failed') {
              console.log(`[WebRTC] Creating offer to known peer ${peerId}`);
              createOffer(peerId);
            }
          }, delay);
        }
      }
    }
  }, [state.isVideoEnabled, state.localStream, socket, userId, createOffer]);

  // Initialize devices on mount
  useEffect(() => {
    refreshDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
  }, [refreshDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[WebRTC] Cleaning up...');
      disableVideoChat();
    };
  }, [disableVideoChat]);

  // Virtual background service ref
  const virtualBackgroundService = useRef<VirtualBackgroundService | null>(null);
  
  // Audio processor service ref
  const audioProcessorService = useRef<AudioProcessor | null>(null);
  
  // Face avatar service ref
  const faceAvatarService = useRef<FaceAvatarService | null>(null);

  const initializeVirtualBackground = useCallback(async () => {
    console.log('[WebRTC] initializeVirtualBackground called');
    console.log('[WebRTC] Current virtual background config:', state.virtualBackground.config);
    
    try {
      if (virtualBackgroundService.current) {
        console.log('[WebRTC] Disposing existing virtual background service');
        virtualBackgroundService.current.dispose();
      }

      console.log('[WebRTC] Creating new VirtualBackgroundService');
      virtualBackgroundService.current = new VirtualBackgroundService(state.virtualBackground.config);
      
      console.log('[WebRTC] Initializing virtual background service...');
      await virtualBackgroundService.current.initialize();
      
      dispatch({ type: 'SET_VIRTUAL_BACKGROUND_INITIALIZED', payload: true });
      console.log('[WebRTC] Virtual background initialized successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to initialize virtual background:', error);
      dispatch({ type: 'SET_VIRTUAL_BACKGROUND_INITIALIZED', payload: false });
      throw error;
    }
  }, [state.virtualBackground.config]);

  const enableVirtualBackground = useCallback(async () => {
    console.log('[WebRTC] enableVirtualBackground called');
    console.log('[WebRTC] Virtual background service initialized:', virtualBackgroundService.current?.isServiceInitialized());
    console.log('[WebRTC] Local stream available:', !!state.localStream);
    
    if (!virtualBackgroundService.current?.isServiceInitialized()) {
      console.log('[WebRTC] Initializing virtual background service...');
      await initializeVirtualBackground();
    }

    if (!state.localStream || !virtualBackgroundService.current) {
      const error = 'Local stream or virtual background service not available';
      console.error('[WebRTC]', error);
      throw new Error(error);
    }

    try {
      console.log('[WebRTC] Calling setupAndStart on virtual background service with MediaStream...');
      console.log('[WebRTC] Local stream tracks:', state.localStream.getVideoTracks().length, 'video,', state.localStream.getAudioTracks().length, 'audio');
      console.log('[WebRTC] Checking MediaStreamTrackProcessor support:', 'MediaStreamTrackProcessor' in window);
      console.log('[WebRTC] Checking MediaStreamTrackGenerator support:', 'MediaStreamTrackGenerator' in window);
      
      // Use the new setupAndStart method that takes a MediaStream directly
      const virtualStream = await virtualBackgroundService.current.setupAndStart(state.localStream);

      console.log('[WebRTC] setupAndStart completed. Stream:', !!virtualStream);
      console.log('[WebRTC] Virtual stream tracks:', virtualStream?.getVideoTracks().length || 0);

      if (virtualStream) {
        // Replace video track in the local stream
        const audioTracks = state.localStream.getAudioTracks();
        console.log('[WebRTC] Audio tracks from original stream:', audioTracks.length);
        
        // Create new stream with virtual background video and original audio
        const newStream = new MediaStream([
          ...virtualStream.getVideoTracks(),
          ...audioTracks
        ]);

        console.log('[WebRTC] Created new stream with', newStream.getVideoTracks().length, 'video tracks and', newStream.getAudioTracks().length, 'audio tracks');

        // Update all peer connections with new track
        console.log('[WebRTC] Updating', state.peerConnections.size, 'peer connections with new track...');
        state.peerConnections.forEach((peerConnection) => {
          const sender = pcOf(peerConnection)?.getSenders().find(s => s.track?.kind === 'video');
          if (sender && virtualStream.getVideoTracks()[0]) {
            sender.replaceTrack(virtualStream.getVideoTracks()[0]).catch(console.error);
          }
        });

        dispatch({ type: 'SET_LOCAL_STREAM', payload: newStream });
        dispatch({ type: 'SET_VIRTUAL_BACKGROUND_ENABLED', payload: true });
        console.log('[WebRTC] Virtual background enabled successfully');
      } else {
        console.error('[WebRTC] Virtual stream is null or undefined');
      }
    } catch (error) {
      console.error('[WebRTC] Failed to enable virtual background:', error);
      console.error('[WebRTC] Error details:', error instanceof Error ? error.message : String(error));
      console.error('[WebRTC] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }, [state.localStream, state.peerConnections, initializeVirtualBackground]);

  const disableVirtualBackground = useCallback(async () => {
    if (virtualBackgroundService.current) {
      virtualBackgroundService.current.stopVirtualBackground();
    }
    dispatch({ type: 'SET_VIRTUAL_BACKGROUND_ENABLED', payload: false });
    
    // Restore original camera stream
    try {
      console.log('[WebRTC] Restoring original camera stream...');
      
      // Get fresh camera stream
      const constraints = {
        video: state.selectedDevices.cameraId ? {
          deviceId: { exact: state.selectedDevices.cameraId },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        } : {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: true
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Update all peer connections with the new camera track
      state.peerConnections.forEach((peerConnection) => {
        const sender = pcOf(peerConnection)?.getSenders().find(s => s.track?.kind === 'video');
        if (sender && newStream.getVideoTracks()[0]) {
          sender.replaceTrack(newStream.getVideoTracks()[0]).catch(console.error);
        }
      });

      dispatch({ type: 'SET_LOCAL_STREAM', payload: newStream });
      console.log('[WebRTC] Virtual background disabled, restored camera stream');
    } catch (error) {
      console.error('[WebRTC] Failed to restore camera stream after disabling virtual background:', error);
    }
  }, [state.peerConnections, state.selectedDevices.cameraId]);

  const updateVirtualBackgroundConfig = useCallback((config: Partial<VirtualBackgroundConfig>) => {
    dispatch({ type: 'SET_VIRTUAL_BACKGROUND_CONFIG', payload: config });
    
    if (virtualBackgroundService.current) {
      virtualBackgroundService.current.updateConfig(config);
    }
  }, []);

  const initializeAudioProcessor = useCallback(async () => {
    try {
      console.log('[WebRTC] initializeAudioProcessor called');
      console.log('[WebRTC] Audio processor config:', state.audioProcessor.config);
      
      if (audioProcessorService.current) {
        console.log('[WebRTC] Disposing existing audio processor');
        audioProcessorService.current.dispose();
      }

      console.log('[WebRTC] Creating new AudioProcessor instance');
      audioProcessorService.current = new AudioProcessor(state.audioProcessor.config);
      
      console.log('[WebRTC] Initializing audio processor...');
      await audioProcessorService.current.initialize();
      
      dispatch({ type: 'SET_AUDIO_PROCESSOR_INITIALIZED', payload: true });
      console.log('[WebRTC] Audio processor initialized successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to initialize audio processor:', error);
      dispatch({ type: 'SET_AUDIO_PROCESSOR_INITIALIZED', payload: false });
      throw error;
    }
  }, [state.audioProcessor.config]);

  const enableAudioProcessor = useCallback(async () => {
    try {
      console.log('[WebRTC] enableAudioProcessor called');
      console.log('[WebRTC] Local stream available:', !!state.localStream);
      console.log('[WebRTC] Audio processor initialized:', audioProcessorService.current?.isInitialized());
      
      if (!audioProcessorService.current?.isInitialized()) {
        console.log('[WebRTC] Initializing audio processor...');
        await initializeAudioProcessor();
      }

      if (!state.localStream) {
        console.error('[WebRTC] No local stream available');
        throw new Error('Local stream not available');
      }

      if (!audioProcessorService.current) {
        console.error('[WebRTC] Audio processor service not available');
        throw new Error('Audio processor service not available');
      }

      console.log('[WebRTC] Processing audio stream...');
      
      // Process the audio stream
      const processedStream = await audioProcessorService.current.processStream(state.localStream);
      console.log('[WebRTC] Audio stream processed successfully');
      
      // Create new stream with processed audio and original video
      const videoTracks = state.localStream.getVideoTracks();
      const processedAudioTracks = processedStream.getAudioTracks();
      
      console.log('[WebRTC] Video tracks:', videoTracks.length);
      console.log('[WebRTC] Processed audio tracks:', processedAudioTracks.length);
      
      const newStream = new MediaStream([
        ...videoTracks,
        ...processedAudioTracks
      ]);

      // Update all peer connections with the processed audio track
      console.log('[WebRTC] Updating peer connections...');
      state.peerConnections.forEach((peerConnection) => {
        const audioSender = pcOf(peerConnection)?.getSenders().find(s => s.track?.kind === 'audio');
        if (audioSender && processedAudioTracks[0]) {
          audioSender.replaceTrack(processedAudioTracks[0]).catch(console.error);
        }
      });

      dispatch({ type: 'SET_LOCAL_STREAM', payload: newStream });
      dispatch({ type: 'SET_AUDIO_PROCESSOR_ENABLED', payload: true });
      console.log('[WebRTC] Audio processor enabled successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to enable audio processor:', error);
      // Don't throw to prevent UI from showing error state
    }
  }, [state.localStream, state.peerConnections, initializeAudioProcessor]);

  const disableAudioProcessor = useCallback(() => {
    if (audioProcessorService.current) {
      audioProcessorService.current.stop();
    }
    dispatch({ type: 'SET_AUDIO_PROCESSOR_ENABLED', payload: false });
    
    // Note: To fully restore original audio, we'd need to restart the stream
    // For now, just mark as disabled
    console.log('[WebRTC] Audio processor disabled');
  }, []);

  const updateAudioProcessorConfig = useCallback((config: Partial<AudioProcessorConfig>) => {
    dispatch({ type: 'SET_AUDIO_PROCESSOR_CONFIG', payload: config });
    
    if (audioProcessorService.current) {
      audioProcessorService.current.updateConfig(config);
    }
  }, []);

  const initializeFaceAvatar = useCallback(async () => {
    try {
      console.log('[WebRTC] initializeFaceAvatar called');
      console.log('[WebRTC] Face avatar config:', state.faceAvatar.config);
      
      if (faceAvatarService.current) {
        console.log('[WebRTC] Disposing existing face avatar service');
        faceAvatarService.current.dispose();
      }

      console.log('[WebRTC] Creating new FaceAvatarService');
      faceAvatarService.current = new FaceAvatarService(state.faceAvatar.config);
      
      console.log('[WebRTC] Initializing face avatar service...');
      await faceAvatarService.current.initialize();
      
      dispatch({ type: 'SET_FACE_AVATAR_INITIALIZED', payload: true });
      console.log('[WebRTC] Face avatar initialized successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to initialize face avatar:', error);
      dispatch({ type: 'SET_FACE_AVATAR_INITIALIZED', payload: false });
      throw error;
    }
  }, [state.faceAvatar.config]);

  const enableFaceAvatar = useCallback(async () => {
    try {
      console.log('[WebRTC] enableFaceAvatar called');
      console.log('[WebRTC] Face avatar service initialized:', faceAvatarService.current?.isServiceInitialized());
      console.log('[WebRTC] Local stream available:', !!state.localStream);
      
      if (!faceAvatarService.current?.isServiceInitialized()) {
        console.log('[WebRTC] Initializing face avatar service...');
        await initializeFaceAvatar();
      }

      if (!state.localStream) {
        console.error('[WebRTC] No local stream available');
        throw new Error('Local stream not available');
      }

      if (!faceAvatarService.current) {
        console.error('[WebRTC] Face avatar service not available');
        throw new Error('Face avatar service not available');
      }

      console.log('[WebRTC] Processing video stream with face avatar...');
      
      // Process the video stream
      const avatarStream = await faceAvatarService.current.setupAndStart(state.localStream);
      console.log('[WebRTC] Face avatar stream processed successfully');
      
      // Create new stream with avatar video and original audio
      const audioTracks = state.localStream.getAudioTracks();
      const avatarVideoTracks = avatarStream.getVideoTracks();
      
      console.log('[WebRTC] Audio tracks:', audioTracks.length);
      console.log('[WebRTC] Avatar video tracks:', avatarVideoTracks.length);
      
      const newStream = new MediaStream([
        ...avatarVideoTracks,
        ...audioTracks
      ]);

      // Update all peer connections with the avatar video track
      console.log('[WebRTC] Updating peer connections...');
      state.peerConnections.forEach((peerConnection) => {
        const videoSender = pcOf(peerConnection)?.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender && avatarVideoTracks[0]) {
          videoSender.replaceTrack(avatarVideoTracks[0]).catch(console.error);
        }
      });

      dispatch({ type: 'SET_LOCAL_STREAM', payload: newStream });
      dispatch({ type: 'SET_FACE_AVATAR_ENABLED', payload: true });
      console.log('[WebRTC] Face avatar enabled successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to enable face avatar:', error);
      // Don't throw to prevent UI from showing error state
    }
  }, [state.localStream, state.peerConnections, initializeFaceAvatar]);

  const disableFaceAvatar = useCallback(() => {
    if (faceAvatarService.current) {
      faceAvatarService.current.stopFaceAvatar();
    }
    dispatch({ type: 'SET_FACE_AVATAR_ENABLED', payload: false });
    
    // Note: To fully restore original video, we'd need to restart the stream
    // For now, just mark as disabled
    console.log('[WebRTC] Face avatar disabled');
  }, []);

  const updateFaceAvatarConfig = useCallback((config: Partial<FaceAvatarConfig>) => {
    dispatch({ type: 'SET_FACE_AVATAR_CONFIG', payload: config });
    
    if (faceAvatarService.current) {
      faceAvatarService.current.updateConfig(config);
    }
  }, []);

  // Cleanup services on unmount
  useEffect(() => {
    return () => {
      if (virtualBackgroundService.current) {
        virtualBackgroundService.current.dispose();
      }
      if (audioProcessorService.current) {
        audioProcessorService.current.dispose();
      }
      if (faceAvatarService.current) {
        faceAvatarService.current.dispose();
      }
    };
  }, []);

  // Local hark — drive own speaking indicator
  useEffect(() => {
    const sock = (config && config.getSocket && config.getSocket()) || null;
    if (!state.localStream || !sock?.id) return;

    if (localHarkRef.current) {
      try { localHarkRef.current.stop(); } catch { /* noop */ }
      localHarkRef.current = null;
    }

    if (!state.localStream.getAudioTracks().length) return;

    const myId = sock.id;
    try {
      const speech = hark(state.localStream, { interval: HARK_INTERVAL, threshold: HARK_THRESHOLD, play: false });
      speech.on('speaking', () => addSpeaker(myId));
      speech.on('stopped_speaking', () => removeSpeaker(myId));
      localHarkRef.current = speech;
    } catch (err) {
      console.error('[WebRTC] Failed to attach local hark:', err);
    }

    return () => {
      if (localHarkRef.current) {
        try { localHarkRef.current.stop(); } catch { /* noop */ }
        localHarkRef.current = null;
      }
      removeSpeaker(myId);
    };
  }, [state.localStream, config, addSpeaker, removeSpeaker]);

  // Remote hark — attach to each remote stream when it appears
  useEffect(() => {
    state.remoteStreams.forEach((stream, peerId) => {
      if (!harksRef.current.has(peerId)) {
        attachHark(peerId, stream);
      }
    });
    Array.from(harksRef.current.keys()).forEach(peerId => {
      if (!state.remoteStreams.has(peerId)) {
        stopHark(peerId);
      }
    });
  }, [state.remoteStreams, attachHark, stopHark]);

  // Cleanup all harks on unmount
  useEffect(() => {
    return () => {
      harksRef.current.forEach(speech => { try { speech.stop(); } catch { /* noop */ } });
      harksRef.current.clear();
      if (localHarkRef.current) {
        try { localHarkRef.current.stop(); } catch { /* noop */ }
      }
    };
  }, []);

  const isLocalSpeaking = (() => {
    const sock = (config && config.getSocket && config.getSocket()) || null;
    return !!sock?.id && speakingPeers.has(sock.id);
  })();

  const contextValue: WebRTCContextState = {
    ...state,
    speakingPeers,
    isLocalSpeaking,
    enableVideoChat,
    prepareVideoChat,
    confirmVideoChat,
    cancelVideoPreparation,
    disableVideoChat,
    toggleWebcam,
    toggleMicrophone,
    refreshConnections,
    setSelectedCamera,
    setSelectedMicrophone,
    refreshDevices,
    initializeVirtualBackground,
    enableVirtualBackground,
    disableVirtualBackground,
    updateVirtualBackgroundConfig,
    initializeAudioProcessor,
    enableAudioProcessor,
    disableAudioProcessor,
    updateAudioProcessorConfig,
    initializeFaceAvatar,
    enableFaceAvatar,
    disableFaceAvatar,
    updateFaceAvatarConfig,
    // Soundbite-compatible aliases
    isAudioEnabled: !state.isMicrophoneMuted,
    isCameraEnabled: state.isWebcamActive,
    toggleVideo: toggleWebcam,
    toggleAudio: toggleMicrophone,
    selectedCameraId: state.selectedDevices?.cameraId || null,
    selectedMicrophoneId: state.selectedDevices?.microphoneId || null,
    connectionError: null,
    availableDevices: [
      ...state.availableDevices.cameras,
      ...state.availableDevices.microphones,
    ],
  };

  return <WebRTCContext.Provider value={contextValue}>{children}</WebRTCContext.Provider>;
}; 