import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useGameOrientation } from '../../hooks/useGameViewport';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';

interface OrientationPromptProps {
  className?: string;
}

const STORAGE_KEY = 'hg-orientation-dismissed';
const AUTO_DISMISS_MS = 6000;

/**
 * Quiet landscape HINT — deliberately NOT a blocking gate.
 * Portrait is a first-class layout (see the portrait block in
 * prime-suspect-unified.css); this is only an ambient note that landscape
 * gives the table more room. It is a dismissible candlelit strip docked at
 * the bottom edge, auto-retires after 6s, and never covers the whole screen.
 */
const OrientationPrompt: React.FC<OrientationPromptProps> = ({ className = '' }) => {
  const orientation = useGameOrientation();
  const [isDismissed, setIsDismissed] = useState(false);
  const reduced = useReducedMotion();

  // Translation helper
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

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

  // Auto-retire: a hint must never linger over the table.
  useEffect(() => {
    if (!shouldShow) return;
    const id = setTimeout(handleDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [shouldShow]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          role="status"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className={`hg-orientation-hint hg-panel hg-candlelight ${className}`}
        >
          <span className="hg-orientation-hint__icon" aria-hidden="true">
            <RotateCcw size={16} />
          </span>

          <p className="hg-orientation-hint__text">
            {t('orientation.rotateForBestExperience')}
          </p>

          <button
            type="button"
            onClick={handleDismiss}
            className="ps-btn ps-btn--subtle ps-btn--sm hg-orientation-hint__close"
            aria-label={t('orientation.continueInPortrait')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrientationPrompt;
