import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Camera, CameraOff, Video, VideoOff, ExternalLink, Volume2, VolumeX, Eye, EyeOff, Mic, MicOff, Settings, Sparkles } from 'lucide-react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useWebcamConfig } from '../config/WebcamConfig';
import { useVideoUI } from '../contexts/VideoUIContext';
import ReactDOM from 'react-dom';
import { DEFAULT_BACKGROUNDS } from '../services/virtualBackgroundService';
import type { AudioProcessorConfig } from '../services/audioProcessor';
import { getTranslation } from '../utils/translations';
import { useIsMobile } from '../hooks/useIsMobile';
import EnhancedPopupContent from './EnhancedPopupContent';

// Settings preview video component with proper stream attachment via useEffect
const SettingsPreviewVideo: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
    />
  );
};

interface VideoFeedProps {
  stream: MediaStream | null;
  playerName: string;
  lives: number;
  isSelf?: boolean;
  isActive?: boolean;
  isAnswering?: boolean;
  isNextTurn?: boolean;
  onToggleWebcam?: () => void;
  isWebcamOn?: boolean;
  isCompact?: boolean;
  isPopout?: boolean;
  canVote?: boolean;
  onVote?: () => void;
  hasVoted?: boolean;
  isMicrophoneMuted?: boolean;
  onToggleMicrophone?: () => void;
  isGamemaster?: boolean;
  connectionType?: string;
  isMobile?: boolean;
  ballColor?: string; // Ball color from game (for border styling)
}

const VideoFeed: React.FC<VideoFeedProps> = ({
  stream,
  playerName,
  lives: _lives, // Not used in ThinkAlike (no heart display)
  isSelf = false,
  isActive = true,
  isAnswering = false,
  isNextTurn = false,
  onToggleWebcam,
  isWebcamOn = true,
  isCompact = false,
  isPopout = false,
  canVote = false,
  onVote,
  hasVoted = false,
  isMicrophoneMuted = false,
  onToggleMicrophone,
  isGamemaster = false,
  connectionType,
  isMobile = false,
  ballColor
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [isLocallyMuted, setIsLocallyMuted] = useState(isSelf || isPopout); // Only mute self and popout by default
  const [isLocallyHidden, setIsLocallyHidden] = useState(false);
  const attachAttempts = useRef(0);

  // Get language from config
  const config = useWebcamConfig();
  const language = config.getLanguage?.() || 'en';

  const handleVideoClick = async () => {
    if (videoRef.current && needsUserInteraction) {
      try {
        await videoRef.current.play();
        setNeedsUserInteraction(false);
        console.log(`[VideoFeed] Video played after user interaction for ${playerName}`);
      } catch (err) {
        console.error(`[VideoFeed] Failed to play video for ${playerName}:`, err);
      }
    }
  };

  const toggleLocalMute = () => {
    setIsLocallyMuted(!isLocallyMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isLocallyMuted;
    }
  };

  const toggleLocalHide = () => {
    setIsLocallyHidden(!isLocallyHidden);
  };

  useEffect(() => {
    const abortController = new AbortController();
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const attachStream = async () => {
      if (!videoRef.current || !stream || abortController.signal.aborted) return;

      try {
        // Detach any existing stream
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject = null;
        }

        // Attach the new stream
        videoRef.current.srcObject = stream;

        // Wait for metadata to load before playing (prevents AbortError race condition)
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) { reject(new Error('Video element not available')); return; }

          // If metadata already loaded, resolve immediately
          if (video.readyState >= 1) {
            resolve();
            return;
          }

          const onLoaded = () => { cleanup(); resolve(); };
          const onError = (e: Event) => { cleanup(); reject(e); };
          const onAbort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };

          const cleanup = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('error', onError);
            abortController.signal.removeEventListener('abort', onAbort);
          };

          video.addEventListener('loadedmetadata', onLoaded, { once: true });
          video.addEventListener('error', onError, { once: true });
          abortController.signal.addEventListener('abort', onAbort);
        });

        // Check if aborted during metadata loading
        if (abortController.signal.aborted || !videoRef.current) return;

        // Now safe to play - metadata is loaded
        await videoRef.current.play().catch(err => {
          if (abortController.signal.aborted) return;
          console.log(`[VideoFeed] Autoplay prevented for ${playerName}:`, err);
          if (err.name === 'NotAllowedError') {
            setNeedsUserInteraction(true);
          }
        });

        attachAttempts.current = 0;
        const videoTracks = stream.getVideoTracks();
        console.log(`[VideoFeed] Stream attached for ${playerName} (tracks: ${videoTracks.length})`);
      } catch (err) {
        // Ignore AbortError - it's expected on cleanup/re-attachment
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (abortController.signal.aborted) return;

        console.error(`[VideoFeed] Error attaching stream for ${playerName}:`, err);

        // Retry attachment up to 3 times
        if (attachAttempts.current < 3) {
          attachAttempts.current++;
          console.log(`[VideoFeed] Retrying attachment for ${playerName} (attempt ${attachAttempts.current})`);
          retryTimeoutId = setTimeout(() => {
            if (!abortController.signal.aborted) {
              attachStream();
            }
          }, 500 * attachAttempts.current);
        }
      }
    };

    attachStream();

    // Listen for track changes to trigger re-attachment
    const handleTrackChange = () => {
      if (abortController.signal.aborted) return;
      console.log(`[VideoFeed] Track changed for ${playerName}, re-attaching stream`);
      attachStream();
    };

    if (stream) {
      stream.addEventListener('addtrack', handleTrackChange);
      stream.addEventListener('removetrack', handleTrackChange);
    }

    // Cleanup
    return () => {
      abortController.abort();
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      if (stream) {
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.removeEventListener('removetrack', handleTrackChange);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        // Don't stop tracks, just detach from video element
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, playerName]);

  // Apply mute state whenever it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isLocallyMuted;
    }
  }, [isLocallyMuted]);

  // Determine border styling based on state
  let borderClass = 'border-2 border-gray-700 shadow-lg';
  let borderStyle: React.CSSProperties = {};

  if (ballColor) {
    // Use ball color as border if provided (for games like Bumper Balls)
    borderClass = 'border-4 shadow-xl';
    borderStyle = {
      borderColor: ballColor,
      boxShadow: `0 0 20px ${ballColor}40, 0 0 40px ${ballColor}20`
    };
  } else if (isAnswering) {
    // Match TurnBasedGamemaster.tsx answering style (emerald/green)
    borderClass = 'bg-emerald-900/40 border-4 border-emerald-400 shadow-xl shadow-emerald-500/30';
  } else if (isNextTurn) {
    // Match TurnBasedGamemaster.tsx next turn style (purple) - made more prominent
    borderClass = 'bg-purple-900/50 border-4 border-purple-500 shadow-xl shadow-purple-500/30';
  }

  // Don't render inactive feeds on mobile to save space
  if (isMobile && !isActive && !isSelf) {
    return null;
  }

  // Don't render camera-off feeds on mobile unless it's self
  if (isMobile && !isSelf && (!stream || !isWebcamOn || connectionType === 'no-camera')) {
    return null;
  }

  return (
    <div
      className={`relative bg-gray-900 rounded-xl overflow-hidden ${borderClass} ${isMobile ? 'aspect-square webcam-mobile-compact' : 'aspect-video'} transition-all duration-300 hover:shadow-xl ${!isActive && !isSelf ? 'webcam-feed-inactive' : ''}`}
      style={borderStyle}
    >
      {/* Status indicator dot */}
      <div className={`absolute top-3 left-3 w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'} z-20 shadow-lg`} />
      
      {/* Special state indicators */}
      {isAnswering && (
        <div className="absolute top-3 left-10 bg-emerald-500/80 text-emerald-950 px-3 py-1 rounded-md text-xs font-bold z-20 shadow-lg">
          {getTranslation('video.answering', language)}
        </div>
      )}
      
      {/* Next turn indicator - moved to same position as ANSWERING badge */}
      {isNextTurn && !isAnswering && (
        <div className="absolute top-3 left-10 bg-purple-500/80 text-white px-3 py-1 rounded-md text-xs font-bold z-20 shadow-lg">
          {getTranslation('video.nextUp', language)}
        </div>
      )}

      {/* Video element or placeholder - both maintain aspect ratio */}
      <div className="absolute inset-0 flex items-center justify-center">
        {stream && isWebcamOn && !isLocallyHidden && connectionType !== 'no-camera' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocallyMuted}
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedMetadata={() => console.log(`[VideoFeed] Metadata loaded for ${playerName}`)}
              onClick={handleVideoClick}
              style={{ cursor: needsUserInteraction ? 'pointer' : 'default' }}
            />
            {needsUserInteraction && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer z-10"
                onClick={handleVideoClick}
              >
                <div className="text-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 mb-2">
                    <Camera size={32} className="text-white" />
                  </div>
                  <p className="text-white text-sm font-medium">{getTranslation('video.clickToPlay', language)}</p>
                </div>
              </div>
            )}
          </>
        ) : (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-800/80">
            <div className="flex flex-col items-center gap-2">
              <CameraOff size={isCompact ? 40 : 56} className="text-slate-400" />
              <span className="text-slate-300 text-sm font-medium">
                {isLocallyHidden ? getTranslation('video.hidden', language) : getTranslation('video.cameraOff', language)}
              </span>
              {/* Show indicator for players without cameras */}
              {!isSelf && connectionType === 'no-camera' && (
                <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                  📹 {getTranslation('video.noCameraAvailable', language)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Voting button - shown during voting phase, but not for gamemaster or self */}
      {canVote && !isSelf && !isGamemaster && isActive && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            onClick={onVote}
            disabled={hasVoted}
            className={`px-6 py-3 rounded-full font-semibold text-white transition-all duration-200 shadow-xl backdrop-blur-sm ${
              hasVoted 
                ? 'bg-slate-600/80 cursor-not-allowed' 
                : 'bg-red-600/80 hover:bg-red-700/80 hover:scale-105 animate-pulse'
            }`}
          >
            {hasVoted ? getTranslation('video.voted', language) : getTranslation('video.voteToEliminate', language)}
          </button>
        </div>
      )}
      
      {/* Bottom overlay with player info - positioned absolutely */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <div className="flex items-center justify-between">
          <span className={`text-white font-semibold ${isCompact ? 'text-sm' : 'text-base'} drop-shadow-lg`}>{playerName}</span>
        </div>
      </div>
      
      {/* Control buttons */}
      <div className="absolute top-3 right-3 flex gap-2 z-20">
        {/* Self webcam toggle */}
        {isSelf && (
          <button
            onClick={onToggleWebcam}
            disabled={!stream || (stream && stream.getVideoTracks().length === 0)}
            className={`p-2.5 rounded-full ${
              !stream || stream.getVideoTracks().length === 0 
                ? 'bg-slate-800/70 cursor-not-allowed opacity-50' 
                : isWebcamOn 
                  ? 'bg-slate-700/70 hover:bg-slate-600/70' 
                  : 'bg-red-600/70 hover:bg-red-500/70'
            } transition-all duration-200 shadow-lg backdrop-blur-sm`}
            title={
              !stream || stream.getVideoTracks().length === 0 
                ? getTranslation('video.noCameraAvailableTooltip', language)
                : isWebcamOn 
                  ? getTranslation('video.turnOffCamera', language)
                  : getTranslation('video.turnOnCamera', language)
            }
          >
            {isWebcamOn ? <Camera size={18} className="text-white" /> : <CameraOff size={18} className="text-white" />}
          </button>
        )}
        
        {/* Hide/Show toggle for all feeds */}
        <button
          onClick={toggleLocalHide}
          className={`p-2.5 rounded-full ${isLocallyHidden ? 'bg-orange-600/70 hover:bg-orange-500/70' : 'bg-slate-700/70 hover:bg-slate-600/70'} transition-all duration-200 shadow-lg backdrop-blur-sm`}
          title={isLocallyHidden ? getTranslation('video.showVideo', language) : getTranslation('video.hideVideo', language)}
        >
          {isLocallyHidden ? <EyeOff size={18} className="text-white" /> : <Eye size={18} className="text-white" />}
        </button>
        
        {/* Mute/Unmute toggle - show different for self (microphone) vs others (speaker) */}
        {isSelf ? (
          // Microphone mute for self
          <button
            onClick={onToggleMicrophone}
            disabled={!stream || (stream && stream.getAudioTracks().length === 0)}
            className={`p-2.5 rounded-full ${
              !stream || stream.getAudioTracks().length === 0
                ? 'bg-slate-800/70 cursor-not-allowed opacity-50'
                : isMicrophoneMuted 
                  ? 'bg-red-600/70 hover:bg-red-500/70' 
                  : 'bg-slate-700/70 hover:bg-slate-600/70'
            } transition-all duration-200 shadow-lg backdrop-blur-sm`}
            title={
              !stream || stream.getAudioTracks().length === 0
                ? getTranslation('video.noMicrophoneAvailable', language)
                : isMicrophoneMuted 
                  ? getTranslation('video.unmuteMicrophone', language)
                  : getTranslation('video.muteMicrophone', language)
            }
          >
            {isMicrophoneMuted ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
          </button>
        ) : (
          // Speaker mute for others
          <button
            onClick={toggleLocalMute}
            className={`p-2.5 rounded-full ${isLocallyMuted ? 'bg-orange-600/70 hover:bg-orange-500/70' : 'bg-slate-700/70 hover:bg-slate-600/70'} transition-all duration-200 shadow-lg backdrop-blur-sm`}
            title={isLocallyMuted ? getTranslation('video.unmute', language) : getTranslation('video.mute', language)}
          >
            {isLocallyMuted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
          </button>
        )}
      </div>
    </div>
  );
};

// Device Settings Modal Component
const DeviceSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isPreparationMode?: boolean;
  onConfirmVideoChat?: () => void;
  onCancelPreparation?: () => void;
}> = ({ isOpen, onClose, isPreparationMode = false, onConfirmVideoChat, onCancelPreparation }) => {
  const isMobile = useIsMobile();
  const {
    availableDevices,
    selectedDevices,
    setSelectedCamera,
    setSelectedMicrophone,
    virtualBackground,
    initializeVirtualBackground,
    enableVirtualBackground,
    disableVirtualBackground,
    updateVirtualBackgroundConfig,
    audioProcessor,
    initializeAudioProcessor,
    enableAudioProcessor,
    disableAudioProcessor,
    updateAudioProcessorConfig,
    faceAvatar,
    initializeFaceAvatar,
    enableFaceAvatar,
    disableFaceAvatar,
    updateFaceAvatarConfig,
    localStream
  } = useWebRTC();

  // Get language from config
  const webcamConfig = useWebcamConfig();
  const language = webcamConfig.getLanguage?.() || 'en';

  const [selectedTab, setSelectedTab] = useState<'devices' | 'background' | 'audio' | 'avatar'>('devices');
  const [isInitializingVB, setIsInitializingVB] = useState(false);
  const [isInitializingAP, setIsInitializingAP] = useState(false);
  const [keySequence, setKeySequence] = useState('');
  const [showUploadOption, setShowUploadOption] = useState(false);
  const [uploadedBackground, setUploadedBackground] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Avatar feature state
  const [faceKeySequence, setFaceKeySequence] = useState('');
  const [showAvatarOption, setShowAvatarOption] = useState(false);
  const [isInitializingAvatar, setIsInitializingAvatar] = useState(false);

  // Keyboard event listener for secret codes
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Only listen for letter keys
      if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        const newSequence = (keySequence + event.key.toLowerCase()).slice(-6); // Keep last 6 characters
        setKeySequence(newSequence);
        
        // Check for "biceps" code for background upload
        if (selectedTab === 'background' && virtualBackground.isEnabled && newSequence === 'biceps') {
          setShowUploadOption(true);
          // Clear sequence after successful activation
          setTimeout(() => setKeySequence(''), 1000);
        }
        
        // Check for "face" code for avatar feature
        const faceSequence = (faceKeySequence + event.key.toLowerCase()).slice(-4); // Keep last 4 characters
        setFaceKeySequence(faceSequence);
        
        if (faceSequence === 'face') {
          setShowAvatarOption(true);
          // Clear sequence after successful activation
          setTimeout(() => setFaceKeySequence(''), 1000);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, selectedTab, virtualBackground.isEnabled, keySequence, faceKeySequence]);

  // Reset options when modal closes or tab changes
  useEffect(() => {
    if (!isOpen || selectedTab !== 'background') {
      setShowUploadOption(false);
      setKeySequence('');
    }
    if (!isOpen) {
      setFaceKeySequence('');
    }
  }, [isOpen, selectedTab]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPreparationMode && onCancelPreparation) {
      onCancelPreparation();
    }
    onClose();
  };

  const handleDone = () => {
    if (isPreparationMode && onConfirmVideoChat) {
      onConfirmVideoChat();
    }
    onClose();
  };

  const handleEnableVirtualBackground = async () => {
    console.log('[WebcamDisplay] handleEnableVirtualBackground called');
    console.log('[WebcamDisplay] virtualBackground.isInitialized:', virtualBackground.isInitialized);
    console.log('[WebcamDisplay] isInitializingVB:', isInitializingVB);
    
    try {
      setIsInitializingVB(true);
      console.log('[WebcamDisplay] Set isInitializingVB to true');
      
      if (!virtualBackground.isInitialized) {
        console.log('[WebcamDisplay] Virtual background not initialized, calling initializeVirtualBackground...');
        await initializeVirtualBackground();
        console.log('[WebcamDisplay] initializeVirtualBackground completed');
      } else {
        console.log('[WebcamDisplay] Virtual background already initialized');
      }
      
      console.log('[WebcamDisplay] Calling enableVirtualBackground...');
      await enableVirtualBackground();
      console.log('[WebcamDisplay] enableVirtualBackground completed successfully');
    } catch (error) {
      console.error('[WebcamDisplay] Failed to enable virtual background:', error);
      if (error instanceof Error) {
        console.error('[WebcamDisplay] Error stack:', error.stack);
      }
    } finally {
      console.log('[WebcamDisplay] Setting isInitializingVB to false');
      setIsInitializingVB(false);
    }
  };

  const handleDisableVirtualBackground = () => {
    disableVirtualBackground();
  };

  const handleBackgroundSelect = (backgroundUrl: string) => {
    updateVirtualBackgroundConfig({
      backgroundImageUrl: backgroundUrl,
      useBlur: false
    });
  };

  const handleBlurSelect = () => {
    updateVirtualBackgroundConfig({
      useBlur: true,
      backgroundImageUrl: undefined
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedBackground(result);
        updateVirtualBackgroundConfig({
          backgroundImageUrl: result,
          useBlur: false
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleEnableAudioProcessor = async () => {
    try {
      setIsInitializingAP(true);
      if (!audioProcessor.isInitialized) {
        await initializeAudioProcessor();
      }
      await enableAudioProcessor();
    } catch (error) {
      console.error('Failed to enable audio processor:', error);
    } finally {
      setIsInitializingAP(false);
    }
  };

  const handleDisableAudioProcessor = () => {
    disableAudioProcessor();
  };

  const handleAudioConfigUpdate = (updates: Partial<AudioProcessorConfig>) => {
    updateAudioProcessorConfig(updates);
  };

  const handleEnableAvatar = async () => {
    try {
      setIsInitializingAvatar(true);
      console.log('[Avatar] Enabling 3D face avatar...');
      
      if (!faceAvatar.isInitialized) {
        await initializeFaceAvatar();
      }
      
      await enableFaceAvatar();
    } catch (error) {
      console.error('[Avatar] Failed to enable avatar:', error);
    } finally {
      setIsInitializingAvatar(false);
    }
  };

  const handleDisableAvatar = () => {
    disableFaceAvatar();
    console.log('[Avatar] Avatar disabled');
  };



  const handleAvatarTypeSelect = (avatarType: 'raccoon' | 'robot' | 'alien' | 'cat' | 'custom' | 'sphere' | 'cube' | 'ring' | 'triangle') => {
    console.log('[Avatar] Selecting avatar type:', avatarType);
    
    // Update the avatar configuration
    const newConfig = {
      avatarType,
      avatarColor: getAvatarColorForType(avatarType),
      avatarSize: 1,
      trackingSmoothing: 0.8,
      enableBlendshapes: true,
      expressionIntensity: 1.0
    };
    
    // If avatar is currently enabled, we need to restart it with new config
    if (faceAvatar.isEnabled) {
      handleDisableAvatar();
      setTimeout(() => {
        // Update config and re-enable
        updateFaceAvatarConfig(newConfig);
        handleEnableAvatar();
      }, 100);
    } else {
      // Just update config if not enabled
      updateFaceAvatarConfig(newConfig);
    }
  };

  const getAvatarColorForType = (type: string): string => {
    switch (type) {
      case 'vrm': return '#FF6B6B'; // Red for VRM
      case 'sphere': return '#4F46E5'; // Blue
      case 'cube': return '#10B981'; // Green  
      case 'ring': return '#8B5CF6'; // Purple
      case 'triangle': return '#F59E0B'; // Yellow
      default: return '#4F46E5';
    }
  };

  // Render modal at the root level using createPortal to avoid any parent container constraints
  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ 
          zIndex: 2147483646,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'auto'
        }}
      />
      
      {/* Settings Modal */}
      <div 
        className={isMobile 
          ? "fixed inset-0 bg-slate-900 flex flex-col" 
          : "fixed top-[5%] left-1/2 transform -translate-x-1/2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-xl w-[90vw] max-w-[600px] max-h-[85vh] shadow-2xl flex flex-col"
        }
        style={isMobile ? {
          zIndex: 2147483647,
          position: 'fixed',
          isolation: 'isolate',
          pointerEvents: 'auto'
        } : { 
          zIndex: 2147483647,
          position: 'fixed',
          isolation: 'isolate',
          pointerEvents: 'auto',
          transform: 'translate(-50%, 0)',
          top: '5%',
          left: '50%'
        }}
      >
        {!isMobile && (
          <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-cyan-400" />
              Video & Audio Settings
            </h3>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-700/50"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Video Preview Section - Show in preparation mode or when settings are open */}
        {(isPreparationMode || localStream) && (
          <div className="p-6 border-b border-slate-600/50">
            <h4 className="text-md font-medium text-cyan-400 mb-3 flex items-center">
              Preview
            </h4>
            <div className="flex justify-center">
              <div className="relative bg-slate-900 rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10 aspect-video w-full max-w-sm">
                {localStream && localStream.getVideoTracks().length > 0 ? (
                  <SettingsPreviewVideo stream={localStream} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800/80">
                    <div className="flex flex-col items-center gap-2">
                      <CameraOff size={48} className="text-slate-400" />
                      <span className="text-slate-300 text-sm font-medium">
                        {getTranslation('video.noCameraAvailable', language)}
                      </span>
                    </div>
                  </div>
                )}
                {/* Preview label */}
                <div className="absolute bottom-2 left-2 bg-blue-600/80 text-white px-2 py-1 rounded text-xs font-medium">
                  {localStream ? 'Preview' : 'Settings'}
                </div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-slate-800/60 border border-cyan-500/30 rounded-lg">
              <p className="text-cyan-200 text-sm text-center">
                {isPreparationMode ? (
                  localStream ?
                    '👀 This is how you\'ll appear to other players. Configure your settings below before joining.' :
                    '⚙️ Configure your camera, microphone, and effects below. Your camera will activate when you join.'
                ) : (
                  localStream ?
                    '👀 This is your current video feed. Adjust your settings below - changes apply immediately.' :
                    '⚙️ Configure your camera and microphone settings. Changes will apply to your video feed.'
                )}
              </p>
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-600/50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedTab('devices')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors font-mono !rounded-none !normal-case !tracking-normal !bg-transparent !shadow-none before:!content-none hover:!bg-transparent ${
              selectedTab === 'devices'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings size={16} />
            <span>Devices</span>
          </button>
          <button
            onClick={() => setSelectedTab('background')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors font-mono !rounded-none !normal-case !tracking-normal !bg-transparent !shadow-none before:!content-none hover:!bg-transparent ${
              selectedTab === 'background'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={16} />
            <span>Background</span>
          </button>
          <button
            onClick={() => setSelectedTab('audio')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors font-mono !rounded-none !normal-case !tracking-normal !bg-transparent !shadow-none before:!content-none hover:!bg-transparent ${
              selectedTab === 'audio'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic size={16} />
            <span>Audio</span>
          </button>
          {/* Hidden Avatar Tab - Only show when activated */}
          {showAvatarOption && (
            <button
              onClick={() => setSelectedTab('avatar')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors font-mono !rounded-none !normal-case !tracking-normal !bg-transparent !shadow-none before:!content-none hover:!bg-transparent ${
                selectedTab === 'avatar'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">🎭</span>
              <span>3D Avatar</span>
            </button>
          )}
        </div>
        
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4 pb-24' : 'p-6'}`}>
          {selectedTab === 'devices' && (
            <div className="space-y-4">
              {/* Camera Selection */}
              <div>
                <label className="text-sm text-slate-300 font-medium block mb-2">Camera</label>
                <select
                  value={selectedDevices.cameraId}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {availableDevices.cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Microphone Selection */}
              <div>
                <label className="text-sm text-slate-300 font-medium block mb-2">Microphone</label>
                <select
                  value={selectedDevices.microphoneId}
                  onChange={(e) => setSelectedMicrophone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {availableDevices.microphones.map((microphone) => (
                    <option key={microphone.deviceId} value={microphone.deviceId}>
                      {microphone.label || `Microphone ${microphone.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Quality Info */}
              <div className="bg-green-900/30 border border-green-400/50 rounded-lg p-3">
                <p className="text-green-200 text-sm">
                  🎙️ <strong>{getTranslation('video.enhancedAudio', language)}:</strong> {getTranslation('video.enhancedAudioDescription', language)}
                </p>
              </div>
              
              {/* Device Info */}
              <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-400/50 rounded-lg p-3">
                <p className="text-amber-200 text-sm">
                  💡 <strong>Tip:</strong> Changes will take effect immediately. If you experience issues, try refreshing your browser.
                </p>
              </div>
            </div>
          )}
          
          {selectedTab === 'background' && (
            <div className="space-y-4">
              {/* Virtual Background Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <Sparkles size={20} className="text-purple-400" />
                  <div>
                    <p className="font-medium text-slate-200">{getTranslation('video.virtualBackgroundTitle', language)}</p>
                    <p className="text-sm text-slate-400">{getTranslation('video.virtualBackgroundDescription', language)}</p>
                  </div>
                </div>
                <button
                  onClick={virtualBackground.isEnabled ? handleDisableVirtualBackground : handleEnableVirtualBackground}
                  disabled={isInitializingVB}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    virtualBackground.isEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } ${isInitializingVB ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isInitializingVB ? getTranslation('common.loading', language) : virtualBackground.isEnabled ? getTranslation('video.disable', language) : getTranslation('video.enable', language)}
                </button>
              </div>
              
              {/* Background Selection */}
              {virtualBackground.isEnabled && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    {getTranslation('video.backgroundOptions', language)}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Blur Option */}
                    <button
                      onClick={handleBlurSelect}
                      className={`relative overflow-hidden rounded-lg border-2 transition-colors ${
                        virtualBackground.config.useBlur
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-600 hover:border-slate-500 bg-transparent'
                      } flex flex-col items-center justify-center h-20`}
                    >
                      <div className="w-12 h-8 bg-slate-500 rounded blur-sm mb-1" />
                      <span className="text-slate-200 text-xs font-medium">{getTranslation('video.blurBackground', language)}</span>
                    </button>

                    {/* Default Backgrounds */}
                    {DEFAULT_BACKGROUNDS.map((bg, index) => (
                      <button
                        key={index}
                        onClick={() => handleBackgroundSelect(bg.url)}
                        className={`relative overflow-hidden rounded-lg border-2 transition-colors ${
                          !virtualBackground.config.useBlur && virtualBackground.config.backgroundImageUrl === bg.url
                            ? 'border-blue-500'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <img
                          src={bg.url}
                          alt={bg.name}
                          className="w-full h-20 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 text-center">
                          {bg.name}
                        </div>
                      </button>
                    ))}
                    
                    {/* Upload Option - Only visible with secret code */}
                    {showUploadOption && (
                      <>
                        <button
                          onClick={triggerFileUpload}
                          className={`relative overflow-hidden rounded-lg border-2 transition-colors border-dashed ${
                            !virtualBackground.config.useBlur && uploadedBackground && virtualBackground.config.backgroundImageUrl === uploadedBackground
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-slate-500 hover:border-slate-400 bg-transparent'
                          } flex flex-col items-center justify-center h-20`}
                        >
                          <div className="text-slate-300 text-xs font-medium">
                            📁 {getTranslation('video.uploadCustom', language)}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {getTranslation('video.clickToBrowse', language)}
                          </div>
                        </button>
                        
                        {/* Show uploaded background if available */}
                        {uploadedBackground && (
                          <button
                            onClick={() => handleBackgroundSelect(uploadedBackground)}
                            className={`relative overflow-hidden rounded-lg border-2 transition-colors ${
                              !virtualBackground.config.useBlur && virtualBackground.config.backgroundImageUrl === uploadedBackground
                                ? 'border-blue-500'
                                : 'border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            <img
                              src={uploadedBackground}
                              alt="Custom Background"
                              className="w-full h-20 object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 text-center">
                              💪 {getTranslation('video.custom', language)}
                            </div>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
              
              {/* Virtual Background Info */}
              <div className="bg-purple-900/30 border border-purple-400/50 rounded-lg p-3">
                <p className="text-purple-200 text-sm">
                  ✨ <strong>{getTranslation('video.aiBackground', language)}:</strong> {getTranslation('video.aiBackgroundDescription', language)}
                </p>
                {virtualBackground.config.useBlur && (
                  <p className="text-blue-200 text-xs mt-1">
                    💡 <strong>{getTranslation('video.performanceBlur', language)}:</strong> {getTranslation('video.performanceBlurDescription', language)}
                  </p>
                )}
                {showUploadOption && (
                  <p className="text-green-200 text-xs mt-1">
                    💪 <strong>{getTranslation('video.customUpload', language)}:</strong> {getTranslation('video.customUploadDescription', language)}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {selectedTab === 'audio' && (
            <div className="space-y-4">
              {/* Audio Processor Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <Mic size={20} className="text-green-400" />
                  <div>
                    <p className="font-medium text-slate-200">{getTranslation('video.aiNoiseSuppression', language)}</p>
                    <p className="text-sm text-slate-400">{getTranslation('video.aiNoiseSuppressionDescription', language)}</p>
                  </div>
                </div>
                <button
                  onClick={audioProcessor.isEnabled ? handleDisableAudioProcessor : handleEnableAudioProcessor}
                  disabled={isInitializingAP}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    audioProcessor.isEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } ${isInitializingAP ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isInitializingAP ? getTranslation('common.loading', language) : audioProcessor.isEnabled ? getTranslation('video.disable', language) : getTranslation('video.enable', language)}
                </button>
              </div>
              
              {/* Audio Processing Settings */}
              {audioProcessor.isEnabled && (
                <>
                                     {/* Noise Threshold */}
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-3">
                       🔇 {getTranslation('video.noiseThreshold', language)}
                     </label>
                     <input
                       type="range"
                       min="0"
                       max="1"
                       step="0.01"
                       value={audioProcessor.config.noiseThreshold}
                       onChange={(e) => handleAudioConfigUpdate({ noiseThreshold: parseFloat(e.target.value) })}
                       className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                     />
                     <div className="flex justify-between text-xs text-slate-400 mt-1">
                       <span>{getTranslation('video.sensitive', language)}</span>
                       <span className="text-slate-300 font-medium">
                         {Math.round(audioProcessor.config.noiseThreshold * 100)}%
                       </span>
                       <span>{getTranslation('video.aggressive', language)}</span>
                     </div>
                   </div>
                   
                   {/* Gain Smoothing */}
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-3">
                       🎚️ {getTranslation('video.gainSmoothing', language)}
                     </label>
                     <input
                       type="range"
                       min="0"
                       max="1"
                       step="0.01"
                       value={audioProcessor.config.gainSmoothingFactor}
                       onChange={(e) => handleAudioConfigUpdate({ gainSmoothingFactor: parseFloat(e.target.value) })}
                       className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                     />
                     <div className="flex justify-between text-xs text-slate-400 mt-1">
                       <span>{getTranslation('video.fast', language)}</span>
                       <span className="text-slate-300 font-medium">
                         {Math.round(audioProcessor.config.gainSmoothingFactor * 100)}%
                       </span>
                       <span>{getTranslation('video.smooth', language)}</span>
                     </div>
                   </div>
                   
                   {/* Spectral Gate Threshold */}
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-3">
                       🚪 {getTranslation('video.spectralGateThreshold', language)}
                     </label>
                     <input
                       type="range"
                       min="0"
                       max="0.5"
                       step="0.01"
                       value={audioProcessor.config.spectralGateThreshold}
                       onChange={(e) => handleAudioConfigUpdate({ spectralGateThreshold: parseFloat(e.target.value) })}
                       className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                     />
                     <div className="flex justify-between text-xs text-slate-400 mt-1">
                       <span>{getTranslation('video.open', language)}</span>
                       <span className="text-slate-300 font-medium">
                         {Math.round(audioProcessor.config.spectralGateThreshold * 100)}%
                       </span>
                       <span>{getTranslation('video.closed', language)}</span>
                     </div>
                   </div>
                </>
              )}
              
              {/* Audio Processing Info */}
              <div className="bg-green-900/30 border border-green-400/50 rounded-lg p-3">
                <p className="text-green-200 text-sm">
                  🎤 <strong>{getTranslation('video.aiAudioEnhancement', language)}:</strong> {getTranslation('video.aiAudioEnhancementDescription', language)}
                </p>
                <p className="text-green-200 text-xs mt-1">
                  💍 <strong>{getTranslation('video.freeAlternativeToKrisp', language)}:</strong> {getTranslation('video.freeAlternativeToKrispDescription', language)}
                </p>
              </div>
            </div>
          )}
          
          {/* New Avatar Tab */}
          {selectedTab === 'avatar' && showAvatarOption && (
            <div className="space-y-4">
              {/* 3D Avatar Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🎭</span>
                  <div>
                    <p className="font-medium text-slate-200">3D Face Avatar</p>
                    <p className="text-sm text-slate-400">Overlay a 3D avatar that follows your facial expressions</p>
                  </div>
                </div>
                <button
                  onClick={faceAvatar.isEnabled ? handleDisableAvatar : handleEnableAvatar}
                  disabled={isInitializingAvatar}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    faceAvatar.isEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } ${isInitializingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isInitializingAvatar ? getTranslation('common.loading', language) : faceAvatar.isEnabled ? getTranslation('video.disable', language) : getTranslation('video.enable', language)}
                </button>
              </div>
              
              {/* Avatar Options */}
              {faceAvatar.isEnabled && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Avatar Options
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* GLB Avatar Options */}
                    <button 
                      onClick={() => handleAvatarTypeSelect('raccoon')}
                      className={`relative overflow-hidden rounded-lg border-2 transition-colors bg-gradient-to-br from-orange-900/30 to-amber-900/30 flex flex-col items-center justify-center h-20 ${
                        faceAvatar.config.avatarType === 'raccoon' 
                          ? 'border-orange-400 bg-orange-500/20' 
                          : 'border-orange-600/50 hover:border-orange-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">🦝</div>
                      <span className="text-orange-200 text-xs font-medium">Raccoon</span>
                    </button>
                    
                    <button 
                      onClick={() => handleAvatarTypeSelect('robot')}
                      className={`relative overflow-hidden rounded-lg border-2 transition-colors bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex flex-col items-center justify-center h-20 ${
                        faceAvatar.config.avatarType === 'robot' 
                          ? 'border-cyan-400 bg-cyan-500/20' 
                          : 'border-cyan-600/50 hover:border-cyan-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">🤖</div>
                      <span className="text-cyan-200 text-xs font-medium">Robot</span>
                      <span className="text-cyan-300 text-xs">Soon</span>
                    </button>
                    
                    <button 
                      onClick={() => handleAvatarTypeSelect('alien')}
                      className={`relative overflow-hidden rounded-lg border-2 transition-colors bg-gradient-to-br from-green-900/30 to-emerald-900/30 flex flex-col items-center justify-center h-20 ${
                        faceAvatar.config.avatarType === 'alien' 
                          ? 'border-green-400 bg-green-500/20' 
                          : 'border-green-600/50 hover:border-green-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">👽</div>
                      <span className="text-green-200 text-xs font-medium">Alien</span>
                      <span className="text-green-300 text-xs">Soon</span>
                    </button>
                    
                    <button 
                      onClick={() => handleAvatarTypeSelect('cat')}
                      className={`relative overflow-hidden rounded-lg border-2 transition-colors bg-gradient-to-br from-purple-900/30 to-pink-900/30 flex flex-col items-center justify-center h-20 ${
                        faceAvatar.config.avatarType === 'cat' 
                          ? 'border-purple-400 bg-purple-500/20' 
                          : 'border-purple-600/50 hover:border-purple-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">🐱</div>
                      <span className="text-purple-200 text-xs font-medium">Cat</span>
                      <span className="text-purple-300 text-xs">Soon</span>
                    </button>
                    
                    {/* Simple geometric avatar options */}
                    <button 
                      onClick={() => handleAvatarTypeSelect('sphere')}
                      className={`relative overflow-hidden rounded-lg border-2 transition-colors bg-slate-700/50 flex flex-col items-center justify-center h-20 ${
                        faceAvatar.config.avatarType === 'sphere' 
                          ? 'border-blue-400 bg-blue-500/20' 
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mb-1" />
                      <span className="text-slate-200 text-xs font-medium">Sphere</span>
                    </button>
                    
                    <button 
                      onClick={() => handleAvatarTypeSelect('cube')}
                      className={`relative overflow-hidden rounded-lg border-2 transition-colors bg-slate-700/50 flex flex-col items-center justify-center h-20 ${
                        faceAvatar.config.avatarType === 'cube' 
                          ? 'border-green-400 bg-green-500/20' 
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 transform rotate-45 mb-1" />
                      <span className="text-slate-200 text-xs font-medium">Cube</span>
                    </button>
                  </div>
                  
                  {/* Custom Model Upload Section */}
                  <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                      📦 Custom GLB Model
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".glb"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            updateFaceAvatarConfig({ 
                              avatarType: 'custom',
                              customModelUrl: url 
                            });
                          }
                        }}
                        className="hidden"
                        id="custom-glb-upload"
                      />
                      <label
                        htmlFor="custom-glb-upload"
                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer text-center text-sm text-slate-200 transition-colors"
                      >
                        Upload GLB File
                      </label>
                      <button
                        onClick={() => {
                          const url = prompt('Enter GLB model URL:');
                          if (url) {
                            updateFaceAvatarConfig({ 
                              avatarType: 'custom',
                              customModelUrl: url 
                            });
                          }
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
                      >
                        From URL
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Upload your own 3D head model in GLB format
                    </p>
                  </div>
                </div>
              )}
              
              {/* Avatar Info */}
              <div className="bg-purple-900/30 border border-purple-400/50 rounded-lg p-3">
                <p className="text-purple-200 text-sm">
                  🎭 <strong>3D Face Avatar:</strong> Uses MediaPipe Face Landmarker to track your facial expressions and overlay a 3D avatar that follows your head movements in real-time.
                </p>
                <p className="text-orange-200 text-sm mt-2">
                  🦝 <strong>Multiple Avatars:</strong> Choose from various 3D avatars or upload your own GLB model! The facial transformation matrix ensures accurate tracking.
                </p>
                <p className="text-purple-200 text-xs mt-1">
                  🚀 <strong>Performance:</strong> Runs locally in your browser using WebGL for smooth real-time rendering.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className={`flex justify-end gap-3 border-t border-slate-600/50 flex-shrink-0 ${isMobile ? 'p-4 bg-slate-800' : 'p-6'}`}>
          <button
            onClick={handleClose}
            className={`bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium ${isMobile ? 'flex-1 py-3' : 'px-6 py-2'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className={`bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium ${isMobile ? 'flex-1 py-3' : 'px-6 py-2'}`}
          >
            Done
          </button>
        </div>
      </div>
    </>,
    document.body // Render at the root body level
  );
};

// Separate component for the video chat content
const VideoChatContent: React.FC<{
  isPopout?: boolean;
  onOpenSettings?: () => void;
  ballColors?: Map<string, string>;
}> = ({ isPopout = false, onOpenSettings, ballColors = new Map() }) => {
  const isMobile = useIsMobile();
  const {
    localStream,
    remoteStreams,
    isWebcamActive,
    isMicrophoneMuted,
    toggleWebcam,
    toggleMicrophone,
    disableVideoChat,
    peerConnectionTypes,
    connectionType,
    isVideoEnabled,
    isVideoPrepairing
  } = useWebRTC();

  // Get configuration from adapter
  const webcamConfig = useWebcamConfig();
  const players = webcamConfig.getPlayers?.() || [];
  const gamemaster = webcamConfig.getGamemaster?.() || null;
  const userId = webcamConfig.getUserId();
  const userRole = webcamConfig.getUserRole?.() || 'player';

  console.log('[VideoChatContent] Config values:', {
    userId,
    userRole,
    playersCount: players.length,
    playerIds: players.map(p => p.id),
    ballColorsSize: ballColors.size,
    ballColorsKeys: Array.from(ballColors.keys())
  });
  const hasVoted = webcamConfig.getHasVoted?.() || false;
  const submitVote = webcamConfig.onVote;
  const language = webcamConfig.getLanguage?.() || 'en';

  // Game-specific features (optional)
  // const showLives = webcamConfig.showLives ?? false; // Not used in ThinkAlike (no lives system)
  const showTurnIndicators = webcamConfig.showTurnIndicators ?? false;
  const isVotingPhase = webcamConfig.isVotingPhase?.() || false;
  const answeringPlayerId = showTurnIndicators ? (webcamConfig.getCurrentTurnPlayer?.() || null) : null;
  const nextTurnPlayerId = showTurnIndicators ? (webcamConfig.getNextTurnPlayer?.() || null) : null;

  const [isHidden, setIsHidden] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[VideoChatContent] Current streams:', {
      localStream: localStream ? 'present' : 'null',
      remoteStreamsCount: remoteStreams.size,
      remoteStreamIds: Array.from(remoteStreams.keys()),
      isPopout,
      isVideoEnabled,
      isVideoPrepairing
    });
  }, [localStream, remoteStreams, isPopout, isVideoEnabled, isVideoPrepairing]);

  console.log('[VideoChatContent] Turn state:', {
    answeringPlayerId,
    nextTurnPlayerId,
    showTurnIndicators,
    playersCount: players.length
  });

  // Prepare video feeds
  const videoFeeds = [];

  // Add local stream (self)
  if (userRole === 'gamemaster' && gamemaster) {
    videoFeeds.push({
      id: 'self',
      stream: localStream,
      playerName: '👑 ' + gamemaster.name,
      lives: 0, // ThinkAlike doesn't display lives
      isSelf: true,
      isActive: true,
      isAnswering: false,
      isNextTurn: false,
      isMicrophoneMuted: isMicrophoneMuted,
      onToggleMicrophone: toggleMicrophone,
      isGamemaster: true,
      connectionType: connectionType,
      isMobile: isMobile
    });
  } else {
    const selfPlayer = players.find(p => p.id === userId);
    if (selfPlayer) {
      const selfColor = ballColors.get(userId);
      console.log(`[VideoChatContent] Self player color lookup: userId=${userId}, color=${selfColor}`);

      videoFeeds.push({
        id: 'self',
        stream: localStream,
        playerName: webcamConfig.formatPlayerName?.(selfPlayer) || selfPlayer.name,
        lives: 0, // ThinkAlike doesn't display lives
        isSelf: true,
        isActive: !selfPlayer.isEliminated,
        isAnswering: answeringPlayerId === selfPlayer.id,
        isNextTurn: nextTurnPlayerId === selfPlayer.id && answeringPlayerId !== selfPlayer.id,
        isMicrophoneMuted: isMicrophoneMuted,
        onToggleMicrophone: toggleMicrophone,
        isGamemaster: false,
        connectionType: connectionType,
        isMobile: isMobile,
        ballColor: selfColor
      });
    }
  }

  // Add remote streams for other players
  if (userRole === 'gamemaster') {
    // GM sees all players
    players.forEach(player => {
      if (player.id === userId) {
        return; // already added as self
      }
      const remoteStream = remoteStreams.get(player.id);
      const playerConnectionType = peerConnectionTypes.get(player.id);
      console.log(`[VideoChatContent] GM checking player ${player.name} (${player.id}): stream ${remoteStream ? 'found' : 'not found'}, connectionType: ${playerConnectionType}`);

      videoFeeds.push({
        id: player.id,
        stream: remoteStream || null,
        playerName: webcamConfig.formatPlayerName?.(player) || player.name,
        lives: 0,
        isSelf: false,
        isActive: !player.isEliminated,
        isAnswering: answeringPlayerId === player.id,
        isNextTurn: nextTurnPlayerId === player.id && answeringPlayerId !== player.id,
        isGamemaster: false,
        connectionType: playerConnectionType,
        isMobile: isMobile,
        ballColor: ballColors.get(player.id)
      });
    });
  } else {
    // Players see GM and other players
    if (gamemaster && gamemaster.id !== userId) {
      const gmStream = remoteStreams.get(gamemaster.id);
      const gmConnectionType = peerConnectionTypes.get(gamemaster.id);
      console.log(`[VideoChatContent] Player checking GM (${gamemaster.id}): stream ${gmStream ? 'found' : 'not found'}, connectionType: ${gmConnectionType}`);

      videoFeeds.push({
        id: gamemaster.id,
        stream: gmStream || null,
        playerName: '👑 ' + gamemaster.name,
        lives: 0,
        isSelf: false,
        isActive: true,
        isAnswering: false,
        isNextTurn: false,
        isGamemaster: true,
        connectionType: gmConnectionType,
        isMobile: isMobile,
        ballColor: ballColors.get(gamemaster.id)
      });
    }

    players.forEach(player => {
      if (player.id !== userId && player.id !== gamemaster?.id) {
        const remoteStream = remoteStreams.get(player.id);
        const playerConnectionType = peerConnectionTypes.get(player.id);
        console.log(`[VideoChatContent] Player checking other player ${player.name} (${player.id}): stream ${remoteStream ? 'found' : 'not found'}, connectionType: ${playerConnectionType}`);

        videoFeeds.push({
          id: player.id,
          stream: remoteStream || null,
          playerName: webcamConfig.formatPlayerName?.(player) || player.name,
          lives: 0,
          isSelf: false,
          isActive: !player.isEliminated,
          isAnswering: answeringPlayerId === player.id,
          isNextTurn: nextTurnPlayerId === player.id && answeringPlayerId !== player.id,
          isGamemaster: false,
          connectionType: playerConnectionType,
          isMobile: isMobile,
          ballColor: ballColors.get(player.id)
        });
      }
    });
  }

  console.log(`[VideoChatContent] Total video feeds: ${videoFeeds.length}, isPopout: ${isPopout}`);

  // Return hidden state for all devices
  if (isHidden) {
    return (
      <div className={isMobile ? "webcam-mobile-toggle" : "fixed bottom-4 right-4 z-50"}>
        <button
          onClick={() => setIsHidden(false)}
          className="bg-slate-800/90 backdrop-blur-sm rounded-full p-3 shadow-xl border border-slate-600/50 text-slate-200 hover:text-white transition-colors"
          title={getTranslation('video.videoChat', language)}
        >
          <Video size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isPopout ? 'bg-gray-900' : ''} ${isMobile ? 'webcam-mobile-hide-inactive' : ''}`}>
      {!isPopout && (
        <div className={`${isMobile ? 'webcam-mobile-controls' : 'flex items-center justify-between mb-4'}`}>
          <h3 className="text-lg font-semibold text-gray-200">
            {getTranslation('video.videoChat', language)} ({videoFeeds.length} {getTranslation('video.participants', language)})
            {isVotingPhase && (
              <span className="ml-2 text-sm text-yellow-400 animate-pulse">🗳️ {getTranslation('video.votingPhase', language)}</span>
            )}
          </h3>
          <div className="flex gap-2">
            {/* Hide/show video chat button */}
            <button
              onClick={() => setIsHidden(true)}
              className="btn btn-secondary btn-sm flex items-center space-x-1"
              title={getTranslation('video.hideVideo', language)}
            >
              <EyeOff size={14} />
              <span className={isMobile ? 'hidden' : ''}>{getTranslation('video.hideVideo', language)}</span>
            </button>
            
            {/* Settings button (for all devices) */}
            <button
              onClick={onOpenSettings}
              className="btn btn-secondary btn-sm flex items-center space-x-1"
              title={getTranslation('video.deviceSettings', language)}
            >
              <Settings size={14} />
              <span className={isMobile ? 'hidden' : ''}>{getTranslation('video.settings', language)}</span>
            </button>
            
            {/* Desktop-only controls */}
            {!isMobile && (
              <>
                <button
                  onClick={disableVideoChat}
                  className="btn btn-secondary btn-sm flex items-center space-x-1"
                >
                  <VideoOff size={14} />
                  <span>{getTranslation('video.disableVideo', language)}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Mobile Carousel Layout - Disabled (now shown in Video drawer) */}
      {/* Webcams are now accessed via the Video tab in the bottom navigation */}

      {/* Desktop/Popup Grid Layout */}
      <div
        className={
          isPopout ? (
            // Use custom popup classes with full height
            `webcam-popup-grid ${
              videoFeeds.length === 1 ? 'cols-1' :
              videoFeeds.length === 2 ? 'cols-2' :
              'cols-3'
            }`
          ) : isMobile ? (
            // Mobile grid: hidden (carousel above)
            `webcam-mobile-grid flex-1 hidden ${
              videoFeeds.length === 1 ? 'single' : ''
            }`
          ) : (
            `flex flex-wrap gap-4 flex-1 justify-start items-start`
          )
        }
        style={isPopout ? { height: '100vh', padding: '1rem' } : {}}
      >
        {videoFeeds.map(feed => {
          const feedComponent = (
            <VideoFeed
              key={feed.id}
              stream={feed.stream}
              playerName={feed.playerName}
              lives={feed.lives}
              isSelf={feed.isSelf}
              isActive={feed.isActive}
              isAnswering={feed.isAnswering}
              isNextTurn={feed.isNextTurn}
              onToggleWebcam={feed.isSelf ? toggleWebcam : undefined}
              isWebcamOn={feed.isSelf ? isWebcamActive : true}
              isCompact={!isPopout}
              isPopout={isPopout}
              canVote={isVotingPhase && !feed.isSelf && !feed.isGamemaster && feed.isActive && userRole === 'player'}
              onVote={() => {
                if (!feed.isSelf && !feed.isGamemaster && feed.isActive && userRole === 'player') {
                  console.log(`[VideoChatContent] Voting for ${feed.playerName}`);
                  submitVote?.(feed.id);
                }
              }}
              hasVoted={hasVoted}
              isMicrophoneMuted={feed.isMicrophoneMuted}
              onToggleMicrophone={feed.onToggleMicrophone}
              isGamemaster={feed.isGamemaster}
              connectionType={feed.connectionType || undefined}
              ballColor={feed.ballColor}
            />
          );

          if (isPopout) {
            return (
              <div key={feed.id} className="flex-shrink-0" style={{ height: '28vh', width: 'auto', aspectRatio: '16 / 9' }}>
                {feedComponent}
              </div>
            );
          }

          if (!isMobile) {
            return (
              <div
                key={feed.id}
                className="flex-shrink-0 basis-[240px] sm:basis-[280px] md:basis-[320px] lg:basis-[360px]"
                style={{ height: '180px', width: 'auto', aspectRatio: '16 / 9' }}
              >
                {feedComponent}
              </div>
            );
          }

          return feedComponent;
        })}
      </div>
    </div>
  );
};

interface WebcamDisplayProps {
  className?: string;
  lobby?: any; // Lobby data to get ball colors from gameData
}

const WebcamDisplay: React.FC<WebcamDisplayProps> = ({ className = '', lobby: _lobby }) => {
  const { 
    isVideoEnabled, 
    isVideoPrepairing,
    prepareVideoChat, 
    confirmVideoChat,
    cancelVideoPreparation
  } = useWebRTC();
  // Video UI context for header controls integration
  const videoUI = useVideoUI();
  const [popoutWindow, setPopoutWindow] = useState<Window | null>(null);
  const popoutContainerRef = useRef<HTMLDivElement | null>(null);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  // Get language from config
  const displayConfig = useWebcamConfig();
  const language = displayConfig.getLanguage?.() || 'en';

  // Player colors - same as used in Bumper Balls game
  const PLAYER_COLORS = ['#FF4444', '#4444FF', '#44FF44', '#FFFF44', '#FF44FF', '#44FFFF', '#FF8844', '#8844FF'];

  const config = useWebcamConfig();
  const configPlayers = config.getPlayers?.() || [];

  // Memoize ballColors calculation to prevent recalculation on every render
  const ballColors = useMemo(() => {
    const colors = new Map<string, string>();

    // Map colors based on player index - try multiple strategies to ensure matching
    configPlayers.forEach((player, index) => {
      const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
      // Map by player.id (which comes from getPlayers)
      colors.set(player.id, color);
      console.log(`[WebcamDisplay] Config Player ${index}: ${player.name} (${player.id}) -> ${color}`);
    });

    console.log('[WebcamDisplay] Final ballColors Map keys:', Array.from(colors.keys()));
    console.log('[WebcamDisplay] Final ballColors Map:', Array.from(colors.entries()));

    return colors;
  }, [configPlayers]); // Only recalculate when players change

  // Auto-open settings modal when in preparation mode (after camera is accessed)
  useEffect(() => {
    console.log('[WebcamDisplay] useEffect triggered - isVideoPrepairing:', isVideoPrepairing, 'showDeviceSettings:', showDeviceSettings);
    if (isVideoPrepairing && !showDeviceSettings) {
      console.log('[WebcamDisplay] Opening settings modal due to isVideoPrepairing = true');
      setShowDeviceSettings(true);
    }
  }, [isVideoPrepairing, showDeviceSettings]);

  const handleJoinVideoChat = async () => {
    console.log('[WebcamDisplay] handleJoinVideoChat called - preparing camera for preview');
    // Access camera for local preview (but don't stream to others yet)
    await prepareVideoChat();
    // Open settings immediately for the user while preparation completes
    setShowDeviceSettings(true);
    videoUI.openSettings();
  };

  const handleConfirmVideoChat = async () => {
    // Camera is already prepared, just confirm and make visible to others
    await confirmVideoChat();
    setShowDeviceSettings(false);
  };

  const handleCancelPreparation = () => {
    cancelVideoPreparation();
    setShowDeviceSettings(false);
  };

  const handleOpenSettings = () => {
    setShowDeviceSettings(true);
  };

  // Handle popout window
  const handlePopout = () => {
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    // Use the current URL with a hash to indicate it's a popup
    const popupUrl = window.location.href + '#video-popup';
    
    const newWindow = window.open(
      popupUrl,
      'VideoChatWindow',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes,location=no,status=no`
    );
    
    if (newWindow) {
      // Clear the existing content and write our own
      newWindow.document.open();
      
      // Write the initial HTML structure
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Video Chat - DDF Quiz Game</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0e1628 75%, #0f0f23 100%);
              background-attachment: fixed;
              height: 100vh;
              overflow: hidden;
              font-family: 'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            }
            #webcam-popout-root {
              width: 100%;
              height: 100vh;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            /* Grid layout for video feeds */
            .webcam-popup-grid {
              display: grid;
              gap: 1rem;
              padding: 1rem;
              height: 100vh;
              box-sizing: border-box;
              background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0e1628 75%, #0f0f23 100%);
            }
            .webcam-popup-grid.cols-1 { grid-template-columns: 1fr; }
            .webcam-popup-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
            .webcam-popup-grid.cols-3 { 
              grid-template-columns: repeat(3, 1fr);
              max-width: 100%;
            }
            /* Ensure videos fit properly in grid */
            .webcam-popup-grid > * {
              max-height: calc((100vh - 3rem) / 3);
            }
            /* ====== EnhancedPopupContent.css inlined for CSP ====== */
            /* Enhanced Popup Content Styles */
            
            .enhanced-popup {
              display: flex;
              flex-direction: column;
              height: 100vh;
              background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0e1628 75%, #0f0f23 100%);
              color: white;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            }
            
            /* Header */
            .popup-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.5rem 1rem;
              background: rgba(13, 15, 26, 0.95);
              border-bottom: 2px solid #00d9ff;
              flex-shrink: 0;
            }
            
            .popup-header-left {
              display: flex;
              align-items: center;
              gap: 1.5rem;
            }
            
            .popup-logo {
              font-family: 'Orbitron', sans-serif;
              font-size: 1.25rem;
              font-weight: 700;
            }
            
            .logo-think {
              color: white;
            }
            
            .logo-alike {
              color: #00d9ff;
              text-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
            }
            
            .popup-room-info {
              display: flex;
              align-items: center;
              gap: 1rem;
            }
            
            .room-code {
              padding: 0.25rem 0.625rem;
              background: rgba(0, 217, 255, 0.15);
              border: 1px solid rgba(0, 217, 255, 0.3);
              border-radius: 0.375rem;
              font-size: 0.875rem;
              font-family: monospace;
              color: #00d9ff;
            }
            
            .connected-count {
              display: flex;
              align-items: center;
              gap: 0.375rem;
              color: #94a3b8;
              font-size: 0.875rem;
            }
            
            .popup-header-right {
              display: flex;
              align-items: center;
              gap: 1rem;
            }
            
            /* Layout selector */
            .layout-selector {
              display: flex;
              gap: 0.25rem;
              padding: 0.25rem;
              background: rgba(51, 65, 85, 0.5);
              border-radius: 0.5rem;
            }
            
            .layout-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              background: transparent;
              border: none;
              border-radius: 0.375rem;
              color: #94a3b8;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            
            .layout-btn:hover {
              background: rgba(71, 85, 105, 0.5);
              color: white;
            }
            
            .layout-btn.active {
              background: rgba(0, 217, 255, 0.2);
              color: #00d9ff;
            }
            
            /* SVG icons inside layout buttons */
            .layout-btn svg {
              width: 16px;
              height: 16px;
              stroke: currentColor;
              stroke-width: 2;
              fill: none;
            }
            
            
            
            /* Header video controls - next to layout selector */
            .header-video-controls {
              display: flex;
              gap: 0.25rem;
              padding: 0.25rem;
              background: rgba(51, 65, 85, 0.5);
              border-radius: 0.5rem;
            }
            
            .header-video-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              background: transparent;
              border: none;
              border-radius: 0.375rem;
              color: #94a3b8;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            
            .header-video-btn:hover {
              background: rgba(71, 85, 105, 0.5);
              color: white;
            }
            
            .header-video-btn.muted,
            .header-video-btn.off {
              background: rgba(239, 68, 68, 0.2);
              color: #f87171;
            }
            
            .header-video-btn.leave {
              background: rgba(239, 68, 68, 0.2);
              color: #fca5a5;
            }
            
            .header-video-btn.leave:hover {
              background: rgba(239, 68, 68, 0.3);
            }
            
            .header-video-btn svg {
              width: 16px;
              height: 16px;
              stroke: currentColor;
              stroke-width: 2;
              fill: none;
            }
            
            .popup-close-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              background: rgba(51, 65, 85, 0.5);
              border: 1px solid rgba(71, 85, 105, 0.4);
              border-radius: 0.5rem;
              color: #94a3b8;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            
            .popup-close-btn:hover {
              background: rgba(239, 68, 68, 0.2);
              border-color: rgba(239, 68, 68, 0.4);
              color: #f87171;
            }
            
            /* SVG icon inside close button */
            .popup-close-btn svg {
              width: 20px;
              height: 20px;
              stroke: currentColor;
              stroke-width: 2;
              fill: none;
            }
            
            /* Main content area */
            .popup-content {
              flex: 1;
              padding: 0.5rem;
              overflow: hidden;
              overflow: hidden;
            }
            
            /* Grid layout */
            .popup-grid {
              display: grid;
              gap: 1rem;
              height: 100%;
            }
            
            .popup-grid.cols-1 { grid-template-columns: 1fr; }
            .popup-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
            .popup-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
            .popup-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
            
            /* Speaker layout */
            .popup-speaker-layout {
              display: flex;
              flex-direction: column;
              height: 100%;
              gap: 1rem;
            }
            
            .speaker-main {
              flex: 1;
              min-height: 0;
            }
            
            .speaker-strip {
              display: flex;
              gap: 0.75rem;
              height: 120px;
              overflow-x: auto;
              flex-shrink: 0;
            }
            
            .speaker-strip .popup-video-feed {
              width: 160px;
              flex-shrink: 0;
            }
            
            /* Spotlight layout */
            .popup-spotlight-layout {
              display: flex;
              height: 100%;
              gap: 1rem;
            }
            
            .spotlight-main {
              flex: 1;
              min-width: 0;
            }
            
            .spotlight-sidebar {
              width: 180px;
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
              overflow-y: auto;
              flex-shrink: 0;
            }
            
            .spotlight-sidebar .popup-video-feed {
              height: 120px;
              flex-shrink: 0;
            }
            
            /* Video feed */
            .popup-video-feed {
              position: relative;
              background: #1e293b;
              border-radius: 0.75rem;
              overflow: hidden;
              border: 3px solid var(--border-color, #475569);
              transition: all 0.2s ease;
            }
            
            .popup-video-feed:hover {
              border-color: #00d9ff;
            }
            
            .popup-video-feed.self {
              border-color: #00d9ff;
              box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
            }
            
            .popup-video-feed.large {
              height: 100%;
            }
            
            .popup-video {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            
            .popup-avatar {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
              background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
              font-size: 4rem;
              font-weight: 700;
              color: #64748b;
            }
            
            .popup-video-feed.large .popup-avatar {
              font-size: 8rem;
            }
            
            /* Status indicators */
            .popup-status {
              position: absolute;
              top: 0.5rem;
              right: 0.5rem;
              display: flex;
              gap: 0.25rem;
            }
            
            .popup-status span {
              font-size: 0.875rem;
              background: rgba(0, 0, 0, 0.7);
              padding: 0.25rem 0.5rem;
              border-radius: 0.375rem;
            }
            
            .status-muted { color: #f87171; }
            .status-cam-off { color: #fbbf24; }
            
            /* Name label */
            .popup-name {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              padding: 0.5rem 0.75rem;
              background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
              font-size: 0.875rem;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }
            
            .you-badge {
              padding: 0.125rem 0.375rem;
              background: rgba(0, 217, 255, 0.2);
              border: 1px solid rgba(0, 217, 255, 0.4);
              border-radius: 0.25rem;
              font-size: 0.625rem;
              font-weight: 700;
              color: #00d9ff;
            }
            
            /* Click hint */
            .popup-click-hint {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              padding: 0.75rem;
              background: rgba(0, 0, 0, 0.7);
              border-radius: 50%;
              opacity: 0;
              transition: opacity 0.2s ease;
            }
            
            .popup-video-feed:hover .popup-click-hint {
              opacity: 1;
            }
            
            /* Footer */
            .popup-footer {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0.25rem 1rem;
              background: rgba(13, 15, 26, 0.95);
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              flex-shrink: 0;
              background: rgba(13, 15, 26, 0.95);
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              flex-shrink: 0;
            }
            
            .popup-controls {
              display: flex;
              gap: 0.75rem;
            }
            
            .popup-control-btn {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.5rem 1rem;
              background: rgba(51, 65, 85, 0.5);
              border: 1px solid rgba(71, 85, 105, 0.4);
              border-radius: 0.5rem;
              color: white;
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            
            .popup-control-btn:hover {
              background: rgba(51, 65, 85, 0.8);
            }
            
            .popup-control-btn.off {
              background: rgba(239, 68, 68, 0.2);
              border-color: rgba(239, 68, 68, 0.4);
              color: #fca5a5;
            }
            
            .popup-control-btn svg {
              width: 20px;
              height: 20px;
              stroke: currentColor;
              stroke-width: 2;
              fill: none;
            }
            
            .popup-control-btn.off:hover {
              background: rgba(239, 68, 68, 0.3);
            }
            
            .popup-branding {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.25rem;
              font-size: 0.875rem;
              font-weight: 600;
              width: 100%;
            }
            
            .popup-branding .by { color: #94a3b8; }
            .popup-branding .game { color: #ffffff; font-weight: 700; }
            .popup-branding .buddies { color: #e94560; font-weight: 700; }
            .popup-branding .io { color: #00d9ff; font-weight: 700; }
            
            /* Leave button styling */
            .popup-control-btn.leave {
              background: rgba(239, 68, 68, 0.2);
              border-color: rgba(239, 68, 68, 0.4);
              color: #fca5a5;
            }
            
            .popup-control-btn.leave:hover {
              background: rgba(239, 68, 68, 0.3);
              border-color: rgba(239, 68, 68, 0.6);
            }
            
            /* Mascot logo in popup */
            .popup-mascot {
              width: 32px;
              height: 32px;
              object-fit: contain;
            }
            
            .popup-logo {
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }
            
            .popup-logo-text {
              font-family: 'Orbitron', sans-serif;
              font-size: 1.25rem;
              font-weight: 700;
            }
            /* Branding with mascot */
            .popup-branding-mascot {
              width: 20px;
              height: 20px;
              object-fit: contain;
            }
            .brand-think { color: white; font-weight: 600; }
            .brand-alike { color: #00d9ff; font-weight: 600; }

            

            /* SVG icon styling - ensure icons are visible in popup */
            svg {
              display: inline-block;
              vertical-align: middle;
            }
            .popup-control-btn svg,
            .popup-close-btn svg,
            .connected-count svg {
              width: 20px !important;
              height: 20px !important;
              stroke: currentColor !important;
              stroke-width: 2 !important;
              fill: none !important;
            }
            .layout-btn svg {
              width: 16px !important;
              height: 16px !important;
              stroke: currentColor !important;
              stroke-width: 2 !important;
              fill: none !important;
            }
            .header-video-btn svg {
              width: 16px !important;
              height: 16px !important;
              stroke: currentColor !important;
              stroke-width: 2 !important;
              fill: none !important;
            }
            .popup-click-hint svg {
              width: 16px !important;
              height: 16px !important;
              stroke: currentColor !important;
              stroke-width: 2 !important;
              fill: none !important;
            }
          
            /* Tailwind utility classes for icon sizing */
            .w-4 { width: 1rem; }
            .h-4 { height: 1rem; }
            .w-5 { width: 1.25rem; }
            .h-5 { height: 1.25rem; }
          </style>
        </head>
        <body>
          <div id="webcam-popout-root"></div>
        </body>
        </html>
      `);
      
      newWindow.document.close();
      
      // Update the document title and URL if needed
      try {
        newWindow.history.replaceState(null, 'Video Chat - DDF Quiz Game', popupUrl);
      } catch (e) {
        // Some browsers may block this for security reasons
        console.log('Could not update popup URL:', e);
      }
      
      // NOTE: CSP blocks external stylesheets - all CSS is inlined in the <style> block above
      
      const container = newWindow.document.getElementById('webcam-popout-root') as HTMLDivElement;
      if (container) {
        setPopoutWindow(newWindow);
        popoutContainerRef.current = container;
        
        // Start silent audio loop in popup window to prevent throttling
        try {
          console.log('[Popup] Starting silent audio loop to prevent tab throttling...');
          
          // Create audio context in popup window
          const audioContext = new ((newWindow as any).AudioContext || (newWindow as any).webkitAudioContext)();
          
          // Create a tiny silent buffer (1 frame, 1 channel, 22050Hz sample rate)
          const buffer = audioContext.createBuffer(1, 1, 22050);
          
          // Create and configure source
          const silentAudioSource = audioContext.createBufferSource();
          silentAudioSource.buffer = buffer;
          silentAudioSource.loop = true;
          
          // Connect to destination and start
          silentAudioSource.connect(audioContext.destination);
          silentAudioSource.start(0);
          
          console.log('[Popup] Silent audio loop started successfully');
          
          // Store references on the window object for cleanup
          (newWindow as any).silentAudioContext = audioContext;
          (newWindow as any).silentAudioSource = silentAudioSource;
        } catch (error) {
          console.warn('[Popup] Failed to start silent audio loop:', error);
          // Don't fail the popup if audio loop fails
        }
        
        // Handle window close
        newWindow.addEventListener('beforeunload', () => {
          // Clean up silent audio loop
          try {
            if ((newWindow as any).silentAudioSource) {
              (newWindow as any).silentAudioSource.stop();
              (newWindow as any).silentAudioSource.disconnect();
            }
            if ((newWindow as any).silentAudioContext) {
              (newWindow as any).silentAudioContext.close();
            }
            console.log('[Popup] Silent audio loop cleaned up');
          } catch (error) {
            console.warn('[Popup] Error cleaning up silent audio loop:', error);
          }
          
          setPopoutWindow(null);
          popoutContainerRef.current = null;
        });
      }
    }
  };

  const handleClosePopout = () => {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.close();
    }
    setPopoutWindow(null);
    popoutContainerRef.current = null;
  };

  // Register popup handler with VideoUIContext
  useEffect(() => {
    videoUI.setOnPopupRequested(() => handlePopout);
    return () => {
      videoUI.setOnPopupRequested(null);
    };
  }, [videoUI, handlePopout]);

  // Listen for settings open request from header
  useEffect(() => {
    if (videoUI.isSettingsOpen && !showDeviceSettings) {
      setShowDeviceSettings(true);
      videoUI.closeSettings(); // Reset the trigger
    }
  }, [videoUI.isSettingsOpen, showDeviceSettings, videoUI]);

  // Sync popup state with VideoUIContext
  useEffect(() => {
    videoUI.setPopupOpen(!!popoutWindow);
  }, [popoutWindow, videoUI]);

  // If video chat is not enabled and not preparing, show enable button
  if (!isVideoEnabled && !isVideoPrepairing) {
    return (
      <div className={`webcam-display ${className}`}>
        {showDeviceSettings && (
          <DeviceSettingsModal
            isOpen={showDeviceSettings}
            onClose={() => setShowDeviceSettings(false)}
            isPreparationMode={isVideoPrepairing}
            onConfirmVideoChat={handleConfirmVideoChat}
            onCancelPreparation={handleCancelPreparation}
          />
        )}
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800/80 backdrop-blur-sm rounded-xl border-2 border-slate-600/50 shadow-2xl">
          <Video size={48} className="text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">{getTranslation('video.videoChat', language)}</h3>
          <p className="text-slate-300 text-center mb-4">
            {getTranslation('video.connectToSeeOthers', language)}
          </p>
          <p className="text-slate-400 text-sm text-center mb-4">
            💡 {getTranslation('video.worksWithoutCamera', language)}
          </p>
          <button
            onClick={handleJoinVideoChat}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Video size={16} />
            <span>{getTranslation('video.joinVideoChat', language)}</span>
          </button>
        </div>
      </div>
    );
  }

  // Render popout content if window is open
  if (popoutWindow && !popoutWindow.closed && popoutContainerRef.current) {
    // Get room code for the popup
    const roomCode = displayConfig.getRoomCode?.() || undefined;

    // Use createPortal to maintain the same React context tree
    return (
      <>
        {ReactDOM.createPortal(
          <EnhancedPopupContent
            roomCode={roomCode}
            onClose={handleClosePopout}
          />,
          popoutContainerRef.current
        )}
        <div className={`webcam-display ${className}`}>
          <div className="flex flex-col items-center justify-center p-8 bg-slate-800/80 backdrop-blur-sm rounded-xl border-2 border-slate-600/50 shadow-2xl">
            <ExternalLink size={48} className="text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-100 mb-2">{getTranslation('video.videoChatPoppedOut', language)}</h3>
            <p className="text-slate-300 text-center mb-4">
              {getTranslation('video.videoChatOpenInSeparateWindow', language)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePopout}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <ExternalLink size={16} />
                <span>{getTranslation('video.refreshPopup', language)}</span>
              </button>
              <button
                onClick={handleClosePopout}
                className="btn btn-primary flex items-center space-x-2"
              >
                <span>{getTranslation('video.bringBackVideoChat', language)}</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Normal inline display
  return (
    <div className={`webcam-display webcam-auto-expand ${className}`}>
      {showDeviceSettings && (
        <DeviceSettingsModal
          isOpen={showDeviceSettings}
          onClose={() => setShowDeviceSettings(false)}
          isPreparationMode={isVideoPrepairing}
          onConfirmVideoChat={handleConfirmVideoChat}
          onCancelPreparation={handleCancelPreparation}
        />
      )}
      <VideoChatContent onOpenSettings={handleOpenSettings} ballColors={ballColors} />
      <div className="flex justify-center mt-2">
        <button
          onClick={handlePopout}
          className="btn btn-secondary btn-sm flex items-center space-x-1"
          title={getTranslation('video.popOut', language)}
        >
          <ExternalLink size={14} />
          <span>{getTranslation('video.popOut', language)}</span>
        </button>
      </div>
    </div>
  );
};

export default WebcamDisplay; 
