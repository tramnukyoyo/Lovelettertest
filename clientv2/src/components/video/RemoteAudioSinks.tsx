/**
 * Remote Audio Sinks
 *
 * Plays every remote peer's audio through a dedicated, always-mounted
 * <audio> element — decoupled from the webcam <video> tiles.
 *
 * Why this exists: previously remote audio rode the WebcamDisplay <video>
 * element, which unmounts whenever a tile flips to the avatar placeholder
 * (camera off / "away" / video track muted) OR when the filmstrip is
 * collapsed / the broadcast window is the only view. In all those cases a
 * peer's *voice* cut out even though they were still talking. Owning audio
 * here keeps it playing regardless of what the video UI is doing.
 *
 * Consequently, all webcam <video> elements are kept muted — audio is this
 * component's job alone, so there's never double playback.
 *
 * Per-peer volume / local-mute (Tier 3) hook in here via peerVolume /
 * locallyMuted from the WebRTC context.
 */

import React, { useEffect, useRef } from 'react';
import { useWebRTC } from '../../contexts/WebRTCContext';

interface RemoteAudioElementProps {
  peerId: string;
  stream: MediaStream;
  volume: number;
  muted: boolean;
}

const RemoteAudioElement: React.FC<RemoteAudioElementProps> = ({ peerId, stream, volume, muted }) => {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.play?.().catch(() => { /* autoplay can be blocked until a gesture; harmless */ });
    }
  }, [stream]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, volume));
    el.muted = muted;
  }, [volume, muted]);

  return <audio ref={ref} autoPlay playsInline data-peer={peerId} />;
};

const RemoteAudioSinks: React.FC = () => {
  const { remoteStreams, peerVolume, locallyMutedPeers } = useWebRTC();

  return (
    <div aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from(remoteStreams.entries())
        .filter(([, stream]) => stream.getAudioTracks().length > 0)
        .map(([peerId, stream]) => (
          <RemoteAudioElement
            key={peerId}
            peerId={peerId}
            stream={stream}
            volume={peerVolume.get(peerId) ?? 1}
            muted={locallyMutedPeers.has(peerId)}
          />
        ))}
    </div>
  );
};

export default RemoteAudioSinks;
