/**
 * Kick Toast Component
 *
 * Displays a styled toast notification when a player is kicked from the room.
 * Uses React portal to render at document.body level.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserMinus, X } from 'lucide-react';

interface KickToastProps {
  message: string | null;
  onClose: () => void;
}

const KickToast: React.FC<KickToastProps> = ({ message, onClose }) => {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      console.log('[KickToast] Showing toast with message:', message);
      setVisible(true);

      // Track both timers for cleanup
      let animationTimer: ReturnType<typeof setTimeout> | null = null;

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        console.log('[KickToast] Auto-dismissing');
        setVisible(false);
        animationTimer = setTimeout(onClose, 300); // Wait for animation
      }, 5000);

      return () => {
        clearTimeout(timer);
        if (animationTimer) clearTimeout(animationTimer);
      };
    } else {
      setVisible(false);
    }
  }, [message, onClose]);

  if (!message) return null;

  const handleClose = () => {
    console.log('[KickToast] Manual close');
    setVisible(false);
    // Clear any existing timer before setting new one
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(onClose, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return createPortal(
    <div className={`kick-toast ${visible ? 'visible' : ''}`}>
      <div className="kick-toast-icon">
        <UserMinus className="w-6 h-6" />
      </div>
      <div className="kick-toast-content">
        <span className="kick-toast-title">Kicked from Room</span>
        <span className="kick-toast-message">{message}</span>
      </div>
      <button
        className="kick-toast-close"
        onClick={handleClose}
        type="button"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
};

export default KickToast;
