/**
 * Device Settings Modal
 *
 * Modal shown during "preparing" phase of video chat.
 * Features tabbed interface with:
 * - Devices: Camera/mic selection, privacy options
 * - Background: Virtual background with blur and images
 * - Audio: Noise suppression settings
 * - Avatar: 3D face avatar
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
import { getBroadcastCopy } from './broadcastCopy';

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
  const copy = getBroadcastCopy();
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


  // Privacy settings (persisted in localStorage)
  const [joinMuted, setJoinMuted] = useState(() =>
    localStorage.getItem('joinMuted') === 'true'
  );
  const [joinCameraOff, setJoinCameraOff] = useState(() =>
    localStorage.getItem('joinCameraOff') === 'true'
  );

  // Virtual background settings (always default to disabled)
  const [virtualBgEnabled, setVirtualBgEnabled] = useState(false);
  const [virtualBgType, setVirtualBgType] = useState<'blur' | 'image'>('blur');
  const [virtualBgImage, setVirtualBgImage] = useState<string>(() =>
    localStorage.getItem('virtualBgImage') || ''
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


  // Audio level meter
  useEffect(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    // Clone the track for the meter; force-enable because Chrome copies enabled=false
    const clonedTrack = audioTrack.clone();
    clonedTrack.enabled = true;
    const meterStream = new MediaStream([clonedTrack]);

    let cancelled = false;
    let ctx: AudioContext | null = null;

    try {
      ctx = new AudioContext();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createMediaStreamSource(meterStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (cancelled || !ctx || ctx.state === 'closed') return;
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, average * 1.5));
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('[DeviceSettings] Audio context error:', error);
    }

    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      analyserRef.current = null;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
      clonedTrack.stop();
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
    { id: 'devices', label: copy.deviceSettings.devices, icon: <Monitor size={16} /> },
    { id: 'background', label: copy.deviceSettings.background, icon: <Image size={16} /> },
    { id: 'audio', label: copy.deviceSettings.audio, icon: <Volume2 size={16} /> },
  ];

  if (showAvatarTab) {
    tabs.push({ id: 'avatar', label: copy.deviceSettings.avatar, icon: <User size={16} /> });
  }

  // Use portal to render at document.body level, escaping any stacking context issues
  return createPortal(
    <div className="device-settings-modal-overlay" onClick={onClose}>
      <div className="device-settings-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="device-settings-header">
          <h2>
            {isMobile
              ? (mode === 'setup' ? copy.deviceSettings.cameraSetup : copy.deviceSettings.cameraSettings)
              : (mode === 'setup' ? copy.deviceSettings.joinVideoChat : copy.deviceSettings.videoSettings)
            }
          </h2>
          <button className="device-settings-close" onClick={onClose}>
            <X size={20} />
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
              <VideoOff size={32} />
              <span>{copy.deviceSettings.cameraOff}</span>
            </div>
          )}
          {isVbLoading && !joinCameraOff && (
            <div className="virtual-bg-loading">
              <div className="vb-loading-spinner" />
              <span>{copy.deviceSettings.loadingVirtualBackground}</span>
            </div>
          )}
          {virtualBgEnabled && !joinCameraOff && !isVbLoading && (
            <div className="virtual-bg-badge">
              <Sparkles size={12} />
              <span>{copy.deviceSettings.virtualBackgroundActive}</span>
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
                  <Video size={16} />
                  {copy.deviceSettings.camera}
                </label>
                <select
                  value={selectedCameraId || ''}
                  onChange={e => setSelectedCamera(e.target.value)}
                >
                  {cameras.length === 0 && (
                    <option value="">{copy.deviceSettings.noCamerasFound}</option>
                  )}
                  {cameras.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `${copy.deviceSettings.camera} ${cam.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Microphone Selection */}
              <div className="device-setting-row">
                <label>
                  <Mic size={16} />
                  {copy.deviceSettings.microphone}
                </label>
                <select
                  value={selectedMicrophoneId || ''}
                  onChange={e => setSelectedMicrophone(e.target.value)}
                >
                  {microphones.length === 0 && (
                    <option value="">{copy.deviceSettings.noMicrophonesFound}</option>
                  )}
                  {microphones.map(mic => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `${copy.deviceSettings.microphone} ${mic.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Level Meter - Segmented Bars */}
              <div className={`device-setting-row audio-meter-row${joinMuted ? ' is-muted' : ''}`}>
                <label>
                  {joinMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  {copy.deviceSettings.audioLevel}
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
                    <MicOff size={16} />
                    {copy.deviceSettings.joinMuted}
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
                    <VideoOff size={16} />
                    {copy.deviceSettings.joinWithCameraOff}
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
                  <p>{copy.deviceSettings.virtualBackgroundBrowserSupport}</p>
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
                  <Sparkles size={16} />
                  {copy.deviceSettings.enableVirtualBackground}
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
                      <span>{copy.deviceSettings.blur}</span>
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
                    <p>{copy.deviceSettings.virtualBackgroundInfo}</p>
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
                  <Volume2 size={16} />
                  {copy.deviceSettings.noiseSuppression}
                </span>
              </label>

              {noiseSuppressionEnabled && (
                <>
                  {/* Noise Threshold Slider */}
                  <div className="slider-setting">
                    <label>
                      <span>{copy.deviceSettings.noiseThreshold}</span>
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
                      <span>{copy.deviceSettings.sensitive}</span>
                      <span>{copy.deviceSettings.aggressive}</span>
                    </div>
                  </div>

                  <div className="background-info success">
                    <p>{copy.deviceSettings.noiseSuppressionInfo}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AVATAR TAB - Desktop only */}
          {!isMobile && activeTab === 'avatar' && (
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
                  <User size={16} />
                  {copy.deviceSettings.faceAvatar}
                </span>
              </label>

              {avatarEnabled && (
                <>
                  {/* Avatar Options */}
                  <div className="avatar-options">
                    {[
                      { id: 'raccoon', emoji: '\u{1F99D}', label: copy.deviceSettings.raccoon },
                      { id: 'metahuman', emoji: '\u{1F9D1}', label: copy.deviceSettings.metahuman },
                      { id: 'cat', emoji: '\u{1F431}', label: copy.deviceSettings.cat },
                      { id: 'panda', emoji: '\u{1F43C}', label: 'Panda' },
                      { id: 'pug', emoji: '\u{1F436}', label: 'Pug' },
                      { id: 'bunny', emoji: '\u{1F430}', label: 'Bunny' },
                      { id: 'robot', emoji: '\u{1F916}', label: copy.deviceSettings.robot, soon: true },
                      { id: 'alien', emoji: '\u{1F47D}', label: copy.deviceSettings.alien, soon: true },
                    ].map(avatar => (
                      <button
                        key={avatar.id}
                        className={`avatar-option ${avatarType === avatar.id ? 'active' : ''} ${avatar.soon ? 'disabled' : ''}`}
                        onClick={() => !avatar.soon && setAvatarType(avatar.id)}
                        disabled={avatar.soon}
                      >
                        <span className="avatar-emoji">{avatar.emoji}</span>
                        <span className="avatar-label">{avatar.label}</span>
                        {avatar.soon && <span className="soon-badge">{copy.deviceSettings.soon}</span>}
                      </button>
                    ))}
                  </div>

                  <div className="background-info experimental">
                    <p>{copy.deviceSettings.avatarInfo}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="device-settings-actions">
          <button className="device-settings-cancel" onClick={onClose}>
            {mode === 'setup' ? copy.deviceSettings.cancel : copy.deviceSettings.close}
          </button>
          <button className="device-settings-confirm" onClick={handleConfirm}>
            <Check size={16} />
            {mode === 'setup' ? copy.deviceSettings.joinVideoChat : copy.deviceSettings.saveSettings}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeviceSettingsModal;
