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
import { useWebRTC } from '../../contexts/WebRTCContext';
import { useIsLobbyCompact } from '../../hooks/useIsMobile';
import { t, getCurrentLanguage } from '../../utils/translations';
import { getTranslation } from '../../utils/gameTranslations';
// Heavy effect services (MediaPipe / three.js) are dynamically imported in the
// preview-rebuild effect — only when the user enables an effect. Defaults come
// from the lightweight config module so this modal stays out of those chunks.
import {
  DEFAULT_VIRTUAL_BACKGROUND_CONFIG,
  DEFAULT_BACKGROUNDS,
  DEFAULT_AVATAR_CONFIG
} from '../../services/videoEffectsConfig';
import type { FaceAvatarConfig, FaceAvatarService } from '../../services/faceAvatarService';
import type { VirtualBackgroundService } from '../../services/virtualBackgroundService';

type TabId = 'devices' | 'background' | 'audio' | 'avatar';

/**
 * Eyebrow copy with an EN literal fallback: `getTranslation` returns the KEY
 * itself on a miss, so a `|| fallback` never fires. Used until the new eyebrow
 * key lands in all six locale tables (copy request filed).
 */
const eyebrowCopy = (key: string, fallback: string): string => {
  const value = getTranslation(key, getCurrentLanguage());
  return value === key ? fallback : value;
};

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
    connectionError,
    applyNoiseSuppressionFromSettings,
    pttEnabled,
    setPttEnabled
  } = useWebRTC();

  const isMobile = useIsLobbyCompact();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('devices');


  // Privacy settings (persisted in localStorage)
  const [joinMuted, setJoinMuted] = useState(false);
  const [joinCameraOff, setJoinCameraOff] = useState(false);

  // Virtual background settings (always default to disabled)
  const [virtualBgEnabled, setVirtualBgEnabled] = useState(false);
  const [virtualBgType, setVirtualBgType] = useState<'blur' | 'image'>('blur');
  const [virtualBgImage, setVirtualBgImage] = useState<string>('');

  // Audio settings
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(true);

  // Avatar settings
  const [avatarEnabled, setAvatarEnabled] = useState(false);
  const [avatarType, setAvatarType] = useState('raccoon');

  // Audio level visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Virtual-background + face-avatar live preview.
  // Both services are kept alive across the modal's lifetime — toggling
  // mode (blur ↔ image, raccoon ↔ robot) calls updateConfig() instead of
  // disposing+rebuilding, so we don't churn WebGL contexts every click.
  const vbServiceRef = useRef<VirtualBackgroundService | null>(null);
  const faServiceRef = useRef<FaceAvatarService | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isVbLoading, setIsVbLoading] = useState(false);
  const [, setIsFaLoading] = useState(false);

  // Attach stream to video element (use previewStream if available, else localStream)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = previewStream || localStream;
    }
  }, [previewStream, localStream]);

  // Build / update the preview chain when relevant settings change.
  // Chain: localStream → [VB] → [FA] → previewStream.
  // Each stage is independently toggleable. Within each stage we use
  // updateConfig() for mode swaps (no GPU-context churn), and only
  // dispose+rebuild when the enabled flag flips.
  useEffect(() => {
    if (!localStream || !isOpen) return;

    let cancelled = false;
    const supports = 'MediaStreamTrackProcessor' in window && 'MediaStreamTrackGenerator' in window;

    const rebuild = async () => {
      let chainStream: MediaStream = localStream;

      // ----- Virtual background stage -----
      if (virtualBgEnabled && supports) {
        // Capture the ref into a local — a concurrent rebuild (settings change
        // re-runs the effect while this one awaits) can null the ref between
        // the await and the read below.
        const existingVb = vbServiceRef.current;
        if (existingVb) {
          await existingVb.updateConfig({
            useBlur: virtualBgType === 'blur',
            backgroundImageUrl: virtualBgType === 'image' ? virtualBgImage : undefined,
          });
          chainStream = (existingVb as unknown as { _gbPreviewOut?: MediaStream })._gbPreviewOut || chainStream;
        } else {
          setIsVbLoading(true);
          try {
            const { VirtualBackgroundService } = await import('../../services/virtualBackgroundService');
            const vb = new VirtualBackgroundService({
              ...DEFAULT_VIRTUAL_BACKGROUND_CONFIG,
              useBlur: virtualBgType === 'blur',
              backgroundImageUrl: virtualBgType === 'image' ? virtualBgImage : undefined,
            });
            await vb.initialize();
            if (cancelled) { vb.dispose(); return; }
            const out = await vb.setupAndStart(localStream);
            (vb as unknown as { _gbPreviewOut?: MediaStream })._gbPreviewOut = out;
            vbServiceRef.current = vb;
            chainStream = out;
          } catch (err) {
            console.error('[DeviceSettings] VB preview failed:', err);
          } finally {
            if (!cancelled) setIsVbLoading(false);
          }
        }
      } else if (vbServiceRef.current) {
        try { vbServiceRef.current.dispose(); } catch { /* noop */ }
        vbServiceRef.current = null;
        if (faServiceRef.current) {
          try { faServiceRef.current.dispose(); } catch { /* noop */ }
          faServiceRef.current = null;
        }
      }

      // ----- Face avatar stage -----
      if (avatarEnabled && supports) {
        const existingFa = faServiceRef.current;
        if (existingFa) {
          await existingFa.updateConfig({ avatarType: avatarType as FaceAvatarConfig['avatarType'] });
          chainStream = (existingFa as unknown as { _gbPreviewOut?: MediaStream })._gbPreviewOut || chainStream;
        } else {
          setIsFaLoading(true);
          try {
            const { FaceAvatarService } = await import('../../services/faceAvatarService');
            const fa = new FaceAvatarService({
              ...DEFAULT_AVATAR_CONFIG,
              avatarType: avatarType as FaceAvatarConfig['avatarType'],
            });
            await fa.initialize();
            if (cancelled) { fa.dispose(); return; }
            const out = await fa.setupAndStart(chainStream);
            (fa as unknown as { _gbPreviewOut?: MediaStream })._gbPreviewOut = out;
            faServiceRef.current = fa;
            chainStream = out;
          } catch (err) {
            console.error('[DeviceSettings] FA preview failed:', err);
          } finally {
            if (!cancelled) setIsFaLoading(false);
          }
        }
      } else if (faServiceRef.current) {
        try { faServiceRef.current.dispose(); } catch { /* noop */ }
        faServiceRef.current = null;
      }

      if (!cancelled) {
        const noStages = !vbServiceRef.current && !faServiceRef.current;
        setPreviewStream(noStages ? null : chainStream);
      }
    };

    rebuild().catch(err => console.error('[DeviceSettings] preview rebuild error:', err));

    return () => { cancelled = true; };
  }, [localStream, isOpen, virtualBgEnabled, virtualBgType, virtualBgImage, avatarEnabled, avatarType]);

  // Modal-close cleanup — dispose long-lived services so we don't leak
  // GPU contexts when the user dismisses without joining.
  useEffect(() => {
    if (isOpen) return;
    if (vbServiceRef.current) {
      try { vbServiceRef.current.dispose(); } catch { /* noop */ }
      vbServiceRef.current = null;
    }
    if (faServiceRef.current) {
      try { faServiceRef.current.dispose(); } catch { /* noop */ }
      faServiceRef.current = null;
    }
    setPreviewStream(null);
  }, [isOpen]);

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

    try {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(localStream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [localStream]);

  const handleConfirm = useCallback(async () => {
    // In setup mode, the WebRTC context reads from localStorage during
    // confirmVideoChat. In edit mode the user is already in a video chat;
    // we need to push the new VB / avatar settings through to peers via
    // track replacement.
    if (mode === 'edit') {
      try {
        // rebuildMediaPipeline (shared by all three) re-applies VB + avatar +
        // noise suppression in one pass, so a single call is enough.
        await applyNoiseSuppressionFromSettings();
      } catch (err) {
        console.error('[DeviceSettingsModal] mid-session apply failed:', err);
      }
    }
    onConfirm();
  }, [onConfirm, mode, applyNoiseSuppressionFromSettings]);

  if (!isOpen) return null;

  const cameras = availableDevices.filter(d => d.kind === 'videoinput');
  const microphones = availableDevices.filter(d => d.kind === 'audioinput');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'devices', label: t('video.modal.tabDevices'), icon: <Monitor className="w-4 h-4" /> },
    { id: 'background', label: t('video.modal.tabBackground'), icon: <Image className="w-4 h-4" /> },
    { id: 'audio', label: t('video.modal.tabAudio'), icon: <Volume2 className="w-4 h-4" /> },
  ];

  tabs.push({ id: 'avatar', label: t('video.modal.tabAvatar'), icon: <User className="w-4 h-4" /> });

  // Use portal to render at document.body level, escaping any stacking context issues
  return createPortal(
    <div className="device-settings-modal-overlay" onClick={onClose}>
      <div className="device-settings-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="device-settings-header">
          {/* Dossier masthead — the same eyebrow + title block the settings /
              auth / feedback panels carry, so this modal joins the family
              instead of being the one bare <h2> in the set. */}
          <div className="settings-modal-title">
            <span className="settings-modal-eyebrow">{eyebrowCopy('game.surveillance', 'SURVEILLANCE')}</span>
            <h2>
              {isMobile
                ? (mode === 'setup' ? t('video.modal.titleSetupMobile') : t('video.modal.titleEditMobile'))
                : (mode === 'setup' ? t('video.modal.titleSetup') : t('video.modal.titleEdit'))
              }
            </h2>
          </div>
          <button className="device-settings-close" onClick={onClose} aria-label={t('common.close')}>
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
              <span>{t('video.modal.cameraOff')}</span>
            </div>
          )}
          {isVbLoading && !joinCameraOff && (
            <div className="virtual-bg-loading">
              <div className="vb-loading-spinner" />
              <span>{t('video.modal.loadingVirtualBg')}</span>
            </div>
          )}
          {virtualBgEnabled && !joinCameraOff && !isVbLoading && (
            <div className="virtual-bg-badge">
              <Sparkles className="w-3 h-3" />
              <span>{t('video.modal.virtualBgActive')}</span>
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
                  {t('video.modal.camera')}
                </label>
                <select
                  value={selectedCameraId || ''}
                  onChange={e => setSelectedCamera(e.target.value)}
                >
                  {cameras.length === 0 && (
                    <option value="">{t('video.modal.noCameras')}</option>
                  )}
                  {cameras.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || t('video.modal.cameraFallback', { id: cam.deviceId.slice(0, 8) })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Microphone Selection */}
              <div className="device-setting-row">
                <label>
                  <Mic className="w-4 h-4" />
                  {t('video.modal.microphone')}
                </label>
                <select
                  value={selectedMicrophoneId || ''}
                  onChange={e => setSelectedMicrophone(e.target.value)}
                >
                  {microphones.length === 0 && (
                    <option value="">{t('video.modal.noMicrophones')}</option>
                  )}
                  {microphones.map(mic => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || t('video.modal.microphoneFallback', { id: mic.deviceId.slice(0, 8) })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Level Meter - Segmented Bars */}
              <div className="device-setting-row audio-meter-row">
                <label>
                  {joinMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {t('video.modal.audioLevel')}
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
                    {t('video.modal.joinMuted')}
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
                    {t('video.modal.joinCameraOff')}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* BACKGROUND TAB - Desktop only */}
          {(isMobile || activeTab === 'background') && (
            <div className="device-settings-background">
              {/* Browser compatibility check */}
              {!('MediaStreamTrackProcessor' in window) && (
                <div className="background-info warning">
                  <p>{t('video.modal.vbBrowserWarning')}</p>
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
                  {t('video.modal.enableVirtualBg')}
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
                      <span>{t('video.modal.blur')}</span>
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
                        <img src={bg.url} alt="" />
                      </button>
                    ))}
                  </div>

                  <div className="background-info info">
                    <p>{t('video.modal.vbInfo')}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AUDIO TAB - Desktop only */}
          {(isMobile || activeTab === 'audio') && (
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
                  {t('video.modal.aiNoiseSuppression')}
                </span>
              </label>

              {noiseSuppressionEnabled && (
                <div className="background-info success">
                  <p>{t('video.modal.noiseInfo')}</p>
                </div>
              )}

              {/* Push-to-talk Toggle */}
              <label className="privacy-toggle feature-toggle">
                <input
                  type="checkbox"
                  checked={pttEnabled}
                  onChange={e => setPttEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
                <span className="toggle-label">
                  <Mic className="w-4 h-4" />
                  {t('video.modal.pushToTalk')}
                </span>
              </label>

              {pttEnabled && (
                <div className="background-info">
                  <p>{t('video.modal.pushToTalkInfo')}</p>
                </div>
              )}
            </div>
          )}

          {/* AVATAR TAB - Desktop only */}
          {(isMobile || activeTab === 'avatar') && (
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
                  {t('video.modal.faceAvatar')}
                </span>
              </label>

              {avatarEnabled && (
                <>
                  {/* Avatar Options */}
                  <div className="avatar-options">
                    {([
                      { id: 'raccoon', emoji: '🦝', labelKey: 'video.modal.avatarRaccoon' },
                      { id: 'metahuman', emoji: '🧑', labelKey: 'video.modal.avatarMetaHuman' },
                      { id: 'cat', emoji: '🐱', labelKey: 'video.modal.avatarCat' },
                      { id: 'panda', emoji: '🐼', label: 'Panda' },
                      { id: 'pug', emoji: '🐶', label: 'Pug' },
                      { id: 'bunny', emoji: '🐰', label: 'Bunny' },
                      { id: 'robot', emoji: '🤖', labelKey: 'video.modal.avatarRobot', soon: true },
                      { id: 'alien', emoji: '👽', labelKey: 'video.modal.avatarAlien', soon: true },
                    ] as Array<{ id: string; emoji: string; label?: string; labelKey?: string; soon?: boolean }>).map(avatar => (
                      <button
                        key={avatar.id}
                        className={`avatar-option ${avatarType === avatar.id ? 'active' : ''} ${avatar.soon ? 'disabled' : ''}`}
                        onClick={() => !avatar.soon && setAvatarType(avatar.id)}
                        disabled={avatar.soon}
                      >
                        <span className="avatar-emoji">{avatar.emoji}</span>
                        <span className="avatar-label">{avatar.label ?? (avatar.labelKey ? t(avatar.labelKey) : avatar.id)}</span>
                        {avatar.soon && <span className="soon-badge">{t('video.modal.soon')}</span>}
                      </button>
                    ))}
                  </div>

                  <div className="background-info experimental">
                    <p>{t('video.modal.avatarInfo')}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="device-settings-actions">
          <button className="device-settings-cancel" onClick={onClose}>
            {mode === 'setup' ? t('common.cancel') : t('common.close')}
          </button>
          <button className="device-settings-confirm" onClick={handleConfirm}>
            <Check className="w-4 h-4" />
            {mode === 'setup' ? t('video.modal.joinVideoChat') : t('video.modal.saveSettings')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeviceSettingsModal;
