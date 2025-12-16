import { useVideoKeyboardShortcuts } from '../hooks/useVideoKeyboardShortcuts';
import { useVideoPreferences } from '../hooks/useVideoPreferences';

/**
 * Component that enables video-related enhancements:
 * - Keyboard shortcuts (V, M, C, P)
 * - Preference persistence
 *
 * This is a "headless" component - it doesn't render anything,
 * just activates the hooks.
 */
const VideoEnhancements: React.FC = () => {
  // Enable keyboard shortcuts
  useVideoKeyboardShortcuts();

  // Enable preference persistence
  useVideoPreferences();

  return null;
};

export default VideoEnhancements;
