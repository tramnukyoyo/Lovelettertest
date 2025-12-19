import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useOrientation } from '../../hooks/useIsMobile';

interface OrientationPromptProps {
  className?: string;
}

const STORAGE_KEY = 'hg-orientation-dismissed';

/**
 * Prompts mobile users to rotate to landscape mode for optimal gameplay.
 * Dismissible and remembers dismissal in sessionStorage.
 */
const OrientationPrompt: React.FC<OrientationPromptProps> = ({ className = '' }) => {
  const orientation = useOrientation();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if previously dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  };

  // Only show in portrait mode when not dismissed
  const shouldShow = orientation === 'portrait' && !isDismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 ${className}`}
        >
          {/* Rotating phone icon animation */}
          <motion.div
            animate={{ rotate: [0, -90, -90, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              times: [0, 0.3, 0.7, 1]
            }}
            className="mb-6"
          >
            <div className="relative w-16 h-24 border-4 border-[var(--royal-gold)] rounded-xl">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-[var(--royal-gold)] rounded-full opacity-50" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 border-2 border-[var(--royal-gold)] rounded-full" />
            </div>
          </motion.div>

          <RotateCcw className="w-8 h-8 text-[var(--royal-gold)] mb-4 animate-pulse" />

          <h2 className="text-xl font-bold text-[var(--parchment)] text-center mb-2">
            Rotate for Best Experience
          </h2>

          <p className="text-sm text-[var(--parchment-dark)] text-center max-w-xs mb-8">
            Hearts Gambit plays best in landscape mode. Rotate your device for the full investigation experience.
          </p>

          <button
            onClick={handleDismiss}
            className="flex items-center gap-2 bg-[rgba(var(--accent-color-rgb),0.2)] hover:bg-[rgba(var(--accent-color-rgb),0.3)] text-[var(--parchment)] px-6 py-3 rounded-xl text-sm font-bold transition-all border border-[rgba(var(--accent-color-rgb),0.3)]"
          >
            <X className="w-4 h-4" />
            Continue in Portrait
          </button>

          {/* Decorative corners */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[rgba(var(--accent-color-rgb),0.3)]" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[rgba(var(--accent-color-rgb),0.3)]" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[rgba(var(--accent-color-rgb),0.3)]" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[rgba(var(--accent-color-rgb),0.3)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrientationPrompt;
