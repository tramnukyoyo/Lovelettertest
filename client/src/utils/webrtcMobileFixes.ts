/**
 * WebRTC Mobile Fixes - TypeScript Module
 *
 * Fixes mobile video issues with TURN servers, H.264 codec, and optimized constraints.
 * TURN credentials loaded from VITE_METERED_* environment variables.
 */

// ============================================================================
// MOBILE DETECTION
// ============================================================================

/**
 * Detect if the current device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect if the current device is iOS (iPhone, iPad)
 * iOS Safari only supports H.264 codec, not VP8/VP9
 */
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// ============================================================================
// ICE SERVERS (STUN + TURN)
// ============================================================================

// Cache Cloudflare-minted ICE servers between page loads. CF mints with 24h TTL,
// we re-fetch when within 1h of expiry. Keeps server load to ~1 req per user per
// day rather than per peer-connection.
const CF_CACHE_KEY = 'gb_cf_ice_servers_v1';
type CfCache = { iceServers: RTCIceServer[]; expiresAt: number };

let cfRuntimeCache: CfCache | null = null;
let cfFetchInFlight: Promise<void> | null = null;

function loadCfCacheFromStorage(): CfCache | null {
  try {
    const raw = localStorage.getItem(CF_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CfCache;
    if (!parsed?.iceServers || typeof parsed.expiresAt !== 'number') return null;
    if (parsed.expiresAt - Date.now() < 60 * 60 * 1000) return null; // <1h left → ignore
    return parsed;
  } catch {
    return null;
  }
}

function getMeteredFallback(): RTCIceServer | null {
  const turnUsername = import.meta.env.VITE_METERED_USERNAME;
  const turnPassword = import.meta.env.VITE_METERED_PASSWORD;
  if (!turnUsername || !turnPassword) return null;
  return {
    urls: [
      'turn:a.relay.metered.ca:80',
      'turn:a.relay.metered.ca:80?transport=tcp',
      'turn:a.relay.metered.ca:443',
      'turn:a.relay.metered.ca:443?transport=tcp',
      'turns:a.relay.metered.ca:443',
    ],
    username: turnUsername,
    credential: turnPassword,
  };
}

/**
 * Pre-fetch Cloudflare TURN credentials from our server. Call once on app boot.
 * Returns immediately; populates the runtime cache + localStorage in the background.
 * If our server is down or CF is unconfigured, we silently fall back to Metered+STUN.
 */
export function prefetchTurnCredentials(backendUrl?: string): Promise<void> {
  if (cfFetchInFlight) return cfFetchInFlight;

  // Hot cache already populated this session
  if (cfRuntimeCache && cfRuntimeCache.expiresAt - Date.now() > 60 * 60 * 1000) {
    return Promise.resolve();
  }

  // Try storage first (synchronous, no network)
  const stored = loadCfCacheFromStorage();
  if (stored) {
    cfRuntimeCache = stored;
    return Promise.resolve();
  }

  const base = backendUrl || import.meta.env.VITE_BACKEND_URL || '';
  const url = base ? `${base.replace(/\/$/, '')}/api/turn-credentials` : '/api/turn-credentials';

  cfFetchInFlight = fetch(url, { credentials: 'omit' })
    .then(async (resp) => {
      if (!resp.ok) {
        // 503 = CF not configured on server; quiet log
        if (resp.status !== 503) {
          console.warn(`[WebRTC] TURN credential fetch returned ${resp.status}`);
        }
        return;
      }
      const data = (await resp.json()) as { iceServers: RTCIceServer[]; ttl?: number };
      if (!Array.isArray(data.iceServers) || data.iceServers.length === 0) return;
      const ttlMs = (data.ttl ?? 24 * 3600) * 1000;
      const cache: CfCache = { iceServers: data.iceServers, expiresAt: Date.now() + ttlMs };
      cfRuntimeCache = cache;
      try { localStorage.setItem(CF_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota or private mode */ }
      console.log('[WebRTC] ✅ Cloudflare TURN credentials cached');
    })
    .catch((err) => {
      console.warn('[WebRTC] TURN credential fetch failed (will use Metered fallback):', err?.message || err);
    })
    .finally(() => {
      cfFetchInFlight = null;
    });

  return cfFetchInFlight;
}

/**
 * Get ICE servers configuration. Priority order:
 *   1. Google STUN (always — free, public, fastest path discovery)
 *   2. Cloudflare TURN (if cached) — primary relay
 *   3. Metered TURN (if env vars set) — fallback relay
 *
 * Sync return: peers created before prefetch finishes still get STUN+Metered;
 * peers created after CF cache is populated get the full set.
 */
export function getICEServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (cfRuntimeCache && cfRuntimeCache.expiresAt > Date.now()) {
    servers.push(...cfRuntimeCache.iceServers);
  }

  const metered = getMeteredFallback();
  if (metered) servers.push(metered);

  if (!cfRuntimeCache && !metered) {
    console.warn('[WebRTC] ⚠️ No TURN servers configured — cellular/CGNAT players will fail to connect');
  }

  return servers;
}

// ============================================================================
// BANDWIDTH CONTROL
// ============================================================================

/**
 * Cap the upload bitrate of a peer connection's video sender. Without this,
 * Chrome/Firefox happily push 1.5–2 Mbps per stream which adds up fast on
 * TURN-relayed legs (mesh topology = N-1 streams uploaded per peer).
 *
 * Applied per peer after the connection establishes. Audio is left alone —
 * only ~50 kbps and we want voice to stay clear.
 */
export async function setMaxVideoBitrate(pc: RTCPeerConnection, kbps: number): Promise<void> {
  const senders = pc.getSenders().filter(s => s.track?.kind === 'video');
  for (const sender of senders) {
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = kbps * 1000;
      await sender.setParameters(params);
    } catch (err) {
      console.warn(`[WebRTC] Failed to cap video bitrate to ${kbps}kbps:`, err);
    }
  }
}

// ============================================================================
// MEDIA CONSTRAINTS
// ============================================================================

/**
 * Get mobile-optimized video constraints
 */
export function getVideoConstraints(deviceId?: string): MediaTrackConstraints {
  const baseConstraints: MediaTrackConstraints = deviceId ? { deviceId: { exact: deviceId } } : {};

  if (isMobileDevice()) {
    return {
      ...baseConstraints,
      width: { ideal: 480, max: 640 },
      height: { ideal: 360, max: 480 },
      frameRate: { ideal: 15, max: 24 }
    };
  } else {
    return {
      ...baseConstraints,
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 24, max: 30 }
    };
  }
}

/**
 * Get high-quality audio constraints with noise suppression
 */
export function getAudioConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 48000 },
    channelCount: { ideal: 1 }
  };
}

// ============================================================================
// PEER CONNECTION SETUP
// ============================================================================

/**
 * Set H.264 codec preference for iOS compatibility
 */
export function setH264CodecPreference(peerConnection: RTCPeerConnection, peerId: string): void {
  if (!isIOSDevice()) return;

  console.log(`[WebRTC] iOS device detected, setting H.264 codec preference for ${peerId}`);

  try {
    const transceivers = peerConnection.getTransceivers();
    transceivers.forEach(transceiver => {
      if (transceiver.sender.track?.kind === 'video') {
        const capabilities = RTCRtpSender.getCapabilities('video');
        if (capabilities && capabilities.codecs) {
          const h264Codecs = capabilities.codecs.filter(codec =>
            codec.mimeType.toLowerCase().includes('h264')
          );
          const otherCodecs = capabilities.codecs.filter(codec =>
            !codec.mimeType.toLowerCase().includes('h264')
          );

          if (h264Codecs.length > 0) {
            const preferredCodecs = [...h264Codecs, ...otherCodecs];
            transceiver.setCodecPreferences(preferredCodecs);
          }
        }
      }
    });
  } catch (error) {
    console.warn(`[WebRTC] Failed to set H.264 codec preference for ${peerId}:`, error);
  }
}

/**
 * Add enhanced diagnostics to peer connection
 */
export function addEnhancedDiagnostics(peerConnection: RTCPeerConnection, peerId: string): void {
  peerConnection.oniceconnectionstatechange = () => {
    const iceState = peerConnection.iceConnectionState;
    console.log(`[WebRTC] ICE connection state with ${peerId}: ${iceState}`);

    if (iceState === 'failed') {
      console.error(`[WebRTC] ICE connection failed with ${peerId}`);
    }
  };

  peerConnection.onicegatheringstatechange = () => {
    console.log(`[WebRTC] ICE gathering state with ${peerId}: ${peerConnection.iceGatheringState}`);
  };

  peerConnection.onconnectionstatechange = () => {
    console.log(`[WebRTC] Connection state with ${peerId}: ${peerConnection.connectionState}`);
  };
}

// ============================================================================
// MEDIA STREAM HELPERS
// ============================================================================

export interface GetUserMediaResult {
  stream: MediaStream | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface GetUserMediaOptions {
  cameraId?: string;
  microphoneId?: string;
}

/**
 * Get user media with mobile-optimized constraints
 * Tries multiple combinations: video+audio, audio-only, video-only
 */
export async function getUserMediaWithFallback(options: GetUserMediaOptions = {}): Promise<GetUserMediaResult> {
  const { cameraId, microphoneId } = options;

  // Try video + audio
  try {
    console.log('[WebRTC] Attempting video + audio...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: getVideoConstraints(cameraId),
      audio: getAudioConstraints(microphoneId)
    });
    const hasVideo = stream.getVideoTracks().length > 0;
    const hasAudio = stream.getAudioTracks().length > 0;
    console.log('[WebRTC] Video + Audio enabled');
    return { stream, hasVideo, hasAudio };
  } catch (error) {
    console.log('[WebRTC] Video + Audio failed, trying audio-only...', error);
  }

  // Try audio only
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: getAudioConstraints(microphoneId)
    });
    const hasAudio = stream.getAudioTracks().length > 0;
    console.log('[WebRTC] Audio-only enabled');
    return { stream, hasVideo: false, hasAudio };
  } catch (error) {
    console.log('[WebRTC] Audio failed, trying video-only...', error);
  }

  // Try video only
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: getVideoConstraints(cameraId)
    });
    const hasVideo = stream.getVideoTracks().length > 0;
    console.log('[WebRTC] Video-only enabled');
    return { stream, hasVideo, hasAudio: false };
  } catch (error) {
    console.log('[WebRTC] All media access failed', error);
  }

  return { stream: null, hasVideo: false, hasAudio: false };
}

export default {
  isMobileDevice,
  isIOSDevice,
  getICEServers,
  prefetchTurnCredentials,
  setMaxVideoBitrate,
  getVideoConstraints,
  getAudioConstraints,
  setH264CodecPreference,
  addEnhancedDiagnostics,
  getUserMediaWithFallback
};
