export { useWebRTC } from '../../contexts/WebRTCContext';
export { useVideoUI } from '../../contexts/VideoUIContext';
export type { WebcamPlayer } from '../../config/WebcamConfig';
export type { Team } from '../../types';
export { GAME_META } from '../../config/gameMeta';
export { useIsMobile } from '../../hooks/useIsMobile';
export { VirtualBackgroundService, DEFAULT_BACKGROUNDS } from '../../services/virtualBackgroundService';
export const DEFAULT_VIRTUAL_BACKGROUND_CONFIG = {
  model: 'MediaPipe' as const,
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
};
