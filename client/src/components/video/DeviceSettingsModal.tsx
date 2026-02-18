/**
 * Device Settings Modal
 *
 * Modal shown during "preparing" phase of video chat.
 * Features tabbed interface with:
 * - Devices: Camera/mic selection, privacy options
 * - Background: Virtual background with blur and images
 * - Audio: Noise suppression settings
 * - Avatar: 3D face avatar (hidden, activated by secret code)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Video, Mic, MicOff, VideoOff, X, Check,
  Monitor, Image, Volume2, User,
  Sparkles
} from 'lucide-react';
import { useWebRTC } from './adapters';
import { useIsMobile } from './adapters';
import {
  VirtualBackgroundService,
  DEFAULT_VIRTUAL_BACKGROUND_CONFIG,
  DEFAULT_BACKGROUNDS
} from './adapters';

type TabId = 'devices' | 'background' | 'audio' | 'avatar';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** 'setup' for initial join, 'edit' for changing settings after joined */
  mode?: 'setup' | 'edit';
}

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode = 'setup'
}) => {
  const {
    localStream,
    availableDevices,
    selectedCameraId,
    selectedMicrophoneId,
    setSelectedCamera,
    setSelectedMicrophone,
    connectionError
  } = useWebRTC();

  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('devices');

  // Secret code for avatar tab
  const [secretBuffer, setSecretBuffer] = useState('');
  const [showAvatarTab, setShowAvatarTab] = useState(false);

  // Privacy settings (persisted in localStorage)
  const [joinMuted, setJoinMuted] = useState(() =>
    localStorage.getItem('joinMuted') === 'true'
  );
  const [joinCameraOff, setJoinCameraOff] = useState(() =>
    localStorage.getItem('joinCameraOff') === 'true'
  );

  // Virtual background settings (always default to disabled)
  const [virtualBgEnabled, setVirtualBgEnabled] = useState(false);
  const [virtualBgType, setVirtualBgType] = useState<'blur' | 'image'>(() =>
    (localStorage.getItem('virtualBgType') as 'blur' | 'image') || 'blur'
  );
  const [virtualBgImage, setVirtualBgImage] = useState<string>(() =>
    localStorage.getItem('virtualBgImage') || DEFAULT_BACKGROUNDS[0].url
  );

  // Audio settings
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(() =>
    localStorage.getItem('noiseSuppressionEnabled') !== 'false'
  );
  const [noiseThreshold, setNoiseThreshold] = useState(() =>
    parseInt(localStorage.getItem('noiseThreshold') || '30', 10)
  );

  // Avatar settings
  const [avatarEnabled, setAvatarEnabled] = useState(() =>
    localStorage.getItem('avatarEnabled') === 'true'
  );
  const [avatarType, setAvatarType] = useState(() =>
    localStorage.getItem('avatarType') || 'raccoon'
  );

  // Audio level visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Virtual background preview
  const vbServiceRef = useRef<VirtualBackgroundService | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isVbLoading, setIsVbLoading] = useState(false);

  // Attach stream to video element (use previewStream if available, else localStream)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = previewStream || localStream;
    }
  }, [previewStream, localStream]);

  // Apply virtual background preview when settings change
  useEffect(() => {
    if (!localStream || !isOpen) return;

    let isCancelled = false;

    const applyVirtualBackground = async () => {
      // Dispose previous service
      if (vbServiceRef.current) {
        vbServiceRef.current.dispose();
        vbServiceRef.current = null;
      }

      // If VB is disabled, use original stream
      if (!virtualBgEnabled) {
        setPreviewStream(null);
        setIsVbLoading(false);
        return;
      }

      // Check browser support
      const supportsVB = 'MediaStreamTrackProcessor' in window && 'MediaStreamTrackGenerator' in window;
      if (!supportsVB) {
        setPreviewStream(null);
        setIsVbLoading(false);
        return;
      }

      setIsVbLoading(true);

      try {
        const config = {
          ...DEFAULT_VIRTUAL_BACKGROUND_CONFIG,
          useBlur: virtualBgType === 'blur',
          backgroundImageUrl: virtualBgType === 'image' ? virtualBgImage : undefined
        };

        const vbService = new VirtualBackgroundService(config);
        await vbService.initialize();

        if (isCancelled) {
          vbService.dispose();
          return;
        }

        const processedStream = await vbService.setupAndStart(localStream);
        vbServiceRef.current = vbService;

        if (!isCancelled) {
          setPreviewStream(processedStream);
        }
      } catch (error) {
        console.error('[DeviceSettings] VB preview failed:', error);
        if (!isCancelled) {
          setPreviewStream(null);
        }
      } finally {
        if (!isCancelled) {
          setIsVbLoading(false);
        }
      }
    };

    applyVirtualBackground();

    return () => {
      isCancelled = true;
      if (vbServiceRef.current) {
        vbServiceRef.current.dispose();
        vbServiceRef.current = null;
      }
    };
  }, [localStream, isOpen, virtualBgEnabled, virtualBgType, virtualBgImage]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('joinMuted', String(joinMuted));
  }, [joinMuted]);

  useEffect(() => {
    localStorage.setItem('joinCameraOff', String(joinCameraOff));
  }, [joinCameraOff]);

  useEffect(() => {
    localStorage.setItem('virtualBgEnabled', String(virtualBgEnabled));
  }, [virtualBgEnabled]);

  useEffect(() => {
    localStorage.setItem('virtualBgType', virtualBgType);
  }, [virtualBgType]);

  useEffect(() => {
    localStorage.setItem('virtualBgImage', virtualBgImage);
  }, [virtualBgImage]);

  useEffect(() => {
    localStorage.setItem('noiseSuppressionEnabled', String(noiseSuppressionEnabled));
  }, [noiseSuppressionEnabled]);

  useEffect(() => {
    localStorage.setItem('noiseThreshold', String(noiseThreshold));
  }, [noiseThreshold]);

  useEffect(() => {
    localStorage.setItem('avatarEnabled', String(avatarEnabled));
  }, [avatarEnabled]);

  useEffect(() => {
    localStorage.setItem('avatarType', avatarType);
  }, [avatarType]);

  // Secret code detection
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const newBuffer = (secretBuffer + e.key).slice(-4);
      setSecretBuffer(newBuffer);

      if (newBuffer.toLowerCase() === 'face') {
        setShowAvatarTab(true);
        setActiveTab('avatar');
      }
    };

    if (isOpen) {
      window.addEventListener('keypress', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [isOpen, secretBuffer]);

  // Audio level meter
  useEffect(() => {
    if (!localStream) {
      console.log('[AudioMeter] ❌ No localStream — meter inactive');
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.log('[AudioMeter] ❌ No audio tracks in localStream');
      return;
    }

    console.log('[AudioMeter] ✅ Audio track found:', {
      enabled: audioTrack.enabled,
      muted: audioTrack.muted,
      readyState: audioTrack.readyState,
      label: audioTrack.label,
    });

    try {
      audioContextRef.current = new AudioContext();
      console.log('[AudioMeter] AudioContext state after creation:', audioContextRef.current.state);

      // Resume if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() =>
          console.log('[AudioMeter] AudioContext resumed:', audioContextRef.current?.state)
        );
      }

      const source = audioContextRef.current.createMediaStreamSource(localStream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      let frameCount = 0;

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const level = Math.min(100, average * 1.5);

          // Log every ~60 frames (~1 sec) so console isn't flooded
          if (frameCount % 60 === 0) {
            console.log(`[AudioMeter] level=${level.toFixed(1)} avg=${average.toFixed(2)} ctx=${audioContextRef.current?.state} trackEnabled=${audioTrack.enabled}`);
          }
          frameCount++;

          setAudioLevel(level);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('[DeviceSettings] Audio context error:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [localStream]);

  const handleConfirm = useCallback(() => {
    // Store all settings before confirming
    // The WebRTC context will read from localStorage
    onConfirm();
  }, [onConfirm]);

  if (!isOpen) return null;

  const cameras = availableDevices.filter(d => d.kind === 'videoinput');
  const microphones = availableDevices.filter(d => d.kind === 'audioinput');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'devices', label: 'Devices', icon: <Monitor className="w-4 h-4" /> },
    { id: 'background', label: 'Background', icon: <Image className="w-4 h-4" /> },
    { id: 'audio', label: 'Audio', icon: <Volume2 className="w-4 h-4" /> },
  ];

  if (showAvatarTab) {
    tabs.push({ id: 'avatar', label: 'Avatar', icon: <User className="w-4 h-4" /> });
  }

  // Use portal to render at document.body level, escaping any stacking context issues
  return createPortal(
    <div className="device-settings-modal-overlay" onClick={onClose}>
      <div className="device-settings-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="device-settings-header">
          <h2>
            {isMobile
              ? (mode === 'setup' ? 'Camera Setup' : 'Camera Settings')
              : (mode === 'setup' ? 'Join Video Chat' : 'Video Settings')
            }
          </h2>
          <button className="device-settings-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {connectionError && (
          <div className="device-settings-error">
            {connectionError}
          </div>
        )}

        {/* Video Preview */}
        <div className="device-settings-preview">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={joinCameraOff ? 'camera-off' : ''}
          />
          {joinCameraOff && (
            <div className="camera-off-overlay">
              <VideoOff className="w-8 h-8" />
              <span>Camera Off</span>
            </div>
          )}
          {isVbLoading && !joinCameraOff && (
            <div className="virtual-bg-loading">
              <div className="vb-loading-spinner" />
              <span>Loading virtual background...</span>
            </div>
          )}
          {virtualBgEnabled && !joinCameraOff && !isVbLoading && (
            <div className="virtual-bg-badge">
              <Sparkles className="w-3 h-3" />
              <span>Virtual BG Active</span>
            </div>
          )}
        </div>

        {/* Tab Navigation - Desktop only */}
        {!isMobile && (
          <div className="device-settings-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`device-settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="device-settings-content">
          {/* DEVICES TAB - Always shown on mobile */}
          {(isMobile || activeTab === 'devices') && (
            <div className="device-settings-devices">
              {/* Camera Selection */}
              <div className="device-setting-row">
                <label>
                  <Video className="w-4 h-4" />
                  Camera
                </label>
                <select
                  value={selectedCameraId || ''}
                  onChange={e => setSelectedCamera(e.target.value)}
                >
                  {cameras.length === 0 && (
                    <option value="">No cameras found</option>
                  )}
                  {cameras.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Microphone Selection */}
              <div className="device-setting-row">
                <label>
                  <Mic className="w-4 h-4" />
                  Microphone
                </label>
                <select
                  value={selectedMicrophoneId || ''}
                  onChange={e => setSelectedMicrophone(e.target.value)}
                >
                  {microphones.length === 0 && (
                    <option value="">No microphones found</option>
                  )}
                  {microphones.map(mic => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Level Meter - Segmented Bars */}
              <div className={`device-setting-row audio-meter-row${joinMuted ? ' is-muted' : ''}`}>
                <label>
                  {joinMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  Audio Level
                </label>
                <div className="audio-meter-bars">
                  {Array.from({ length: 12 }, (_, i) => {
                    const threshold = ((i + 1) / 12) * 100;
                    const isActive = audioLevel >= threshold - 8;
                    const colorClass = i < 7 ? 'green' : i < 10 ? 'yellow' : 'red';
                    return (
                      <div
                        key={i}
                        className={`audio-bar ${isActive ? `active ${colorClass}` : ''}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="device-settings-privacy">
                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={joinMuted}
                    onChange={e => setJoinMuted(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-label">
                    <MicOff className="w-4 h-4" />
                    Join Muted
                  </span>
                </label>

                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={joinCameraOff}
                    onChange={e => setJoinCameraOff(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-label">
                    <VideoOff className="w-4 h-4" />
                    Join with Camera Off
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* BACKGROUND TAB - Desktop only */}
          {!isMobile && activeTab === 'background' && (
            <div className="device-settings-background">
              {/* Browser compatibility check */}
              {!('MediaStreamTrackProcessor' in window) && (
                <div className="background-info warning">
                  <p>Virtual backgrounds require Chrome 108+ or a browser with Insertable Streams support.</p>
                </div>
              )}

              {/* Enable Toggle */}
              <label className="privacy-toggle feature-toggle">
                <input
                  type="checkbox"
                  checked={virtualBgEnabled}
                  onChange={e => setVirtualBgEnabled(e.target.checked)}
                  disabled={!('MediaStreamTrackProcessor' in window)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">
                  <Sparkles className="w-4 h-4" />
                  Enable Virtual Background
                </span>
              </label>

              {virtualBgEnabled && (
                <>
                  {/* Blur Option */}
                  <div className="background-options">
                    <button
                      className={`background-option blur-option ${virtualBgType === 'blur' ? 'active' : ''}`}
                      onClick={() => setVirtualBgType('blur')}
                    >
                      <div className="blur-preview" />
                      <span>Blur</span>
                    </button>

                    {/* Preset Backgrounds */}
                    {DEFAULT_BACKGROUNDS.map(bg => (
                      <button
                        key={bg.name}
                        className={`background-option ${virtualBgType === 'image' && virtualBgImage === bg.url ? 'active' : ''}`}
                        onClick={() => {
                          setVirtualBgType('image');
                          setVirtualBgImage(bg.url);
                        }}
                      >
                        <img src={bg.url} alt={bg.name} />
                        <span>{bg.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="background-info info">
                    <p>Virtual backgrounds use AI-powered segmentation to replace your background in real-time.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AUDIO TAB - Desktop only */}
          {!isMobile && activeTab === 'audio' && (
            <div className="device-settings-audio">
              {/* Noise Suppression Toggle */}
              <label className="privacy-toggle feature-toggle">
                <input
                  type="checkbox"
                  checked={noiseSuppressionEnabled}
                  onChange={e => setNoiseSuppressionEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">
                  <Volume2 className="w-4 h-4" />
                  AI Noise Suppression
                </span>
              </label>

              {noiseSuppressionEnabled && (
                <>
                  {/* Noise Threshold Slider */}
                  <div className="slider-setting">
                    <label>
                      <span>Noise Threshold</span>
                      <span className="slider-value">{noiseThreshold}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={noiseThreshold}
                      onChange={e => setNoiseThreshold(parseInt(e.target.value, 10))}
                    />
                    <div className="slider-labels">
                      <span>Sensitive</span>
                      <span>Aggressive</span>
                    </div>
                  </div>

                  <div className="background-info success">
                    <p>Reduces background noise like keyboard clicks, fans, and ambient sounds during video chat.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AVATAR TAB - Desktop only (Hidden until secret code) */}
          {!isMobile && activeTab === 'avatar' && showAvatarTab && (
            <div className="device-settings-avatar">
              {/* Avatar Toggle */}
              <label className="privacy-toggle feature-toggle">
                <input
                  type="checkbox"
                  checked={avatarEnabled}
                  onChange={e => setAvatarEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">
                  <User className="w-4 h-4" />
                  3D Face Avatar
                </span>
              </label>

              {avatarEnabled && (
                <>
                  {/* Avatar Options */}
                  <div className="avatar-options">
                    {[
                      { id: 'raccoon', emoji: '\u{1F99D}', label: 'Raccoon' },
                      { id: 'robot', emoji: '\u{1F916}', label: 'Robot', soon: true },
                      { id: 'alien', emoji: '\u{1F47D}', label: 'Alien', soon: true },
                      { id: 'cat', emoji: '\u{1F431}', label: 'Cat', soon: true },
                    ].map(avatar => (
                      <button
                        key={avatar.id}
                        className={`avatar-option ${avatarType === avatar.id ? 'active' : ''} ${avatar.soon ? 'disabled' : ''}`}
                        onClick={() => !avatar.soon && setAvatarType(avatar.id)}
                        disabled={avatar.soon}
                      >
                        <span className="avatar-emoji">{avatar.emoji}</span>
                        <span className="avatar-label">{avatar.label}</span>
                        {avatar.soon && <span className="soon-badge">Soon</span>}
                      </button>
                    ))}
                  </div>

                  <div className="background-info experimental">
                    <p>Your face movements control a 3D avatar using AI-powered face tracking. Your real face is never shown.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="device-settings-actions">
          <button className="device-settings-cancel" onClick={onClose}>
            {mode === 'setup' ? 'Cancel' : 'Close'}
          </button>
          <button className="device-settings-confirm" onClick={handleConfirm}>
            <Check className="w-4 h-4" />
            {mode === 'setup' ? 'Join Video Chat' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeviceSettingsModal;
