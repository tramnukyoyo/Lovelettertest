/**
 * Lightweight config/constants for the video-effects services.
 *
 * Lives in its own module so UI components (DeviceSettingsModal,
 * VideoEnhancements) can import defaults WITHOUT statically pulling in the
 * heavy effect implementations (virtualBackgroundService → @mediapipe/tasks-vision,
 * faceAvatarService → three + GLTFLoader). Those services are now loaded via
 * dynamic import() only when a user actually enables an effect — keeping
 * MediaPipe/three out of the initial bundle.
 *
 * Type-only imports below are erased at build time, so no runtime dependency
 * on the heavy modules is introduced here.
 */

import type { VirtualBackgroundConfig } from './virtualBackgroundService';
import type { FaceAvatarConfig } from './faceAvatarService';

export const DEFAULT_BACKGROUNDS: { name: string; url: string }[] = [
  { name: 'bg1', url: import.meta.env.BASE_URL + 'backgrounds/1.webp' },
  { name: 'bg2', url: import.meta.env.BASE_URL + 'backgrounds/2.webp' },
  { name: 'bg3', url: import.meta.env.BASE_URL + 'backgrounds/3.webp' },
];

export const DEFAULT_VIRTUAL_BACKGROUND_CONFIG: VirtualBackgroundConfig = {
  model: 'MediaPipe-Multiclass',
  // Smoothstep midpoint — pixel with personConf at this value is 50% alpha.
  segmentationThreshold: 0.5,
  useBlur: true,
  blurAmount: 25,
  // Base EMA factor; per-pixel adapted up to ~0.85 in low-motion regions.
  temporalSmoothing: 0.7,
  // Hair always smooths at least this much — knocks down flyaway-pixel flicker.
  hairTemporalSmoothing: 0.85,
  // Soft falloff width: pixels with personConf within ±band of threshold get
  // partial alpha, hiding the residual halo without a uniform blur pass.
  smoothstepBand: 0.1,
  // Hair gets a much wider band so the silhouette feathers gently.
  hairSmoothstepBand: 0.35,
  // 0 = let smoothstep + EMA do the work. 1 if a tiny residual smoothing helps.
  maskBlur: 0,
};

export const DEFAULT_AVATAR_CONFIG: FaceAvatarConfig = {
  avatarType: 'raccoon',
  avatarColor: '#4F46E5',
  avatarSize: 40,
  trackingSmoothing: 0.8,
  enableBlendshapes: true,
  expressionIntensity: 1.2,
};
