/**
 * Kick Toast Component
 *
 * Displays a styled toast notification when a player is kicked from the room.
 * Uses React portal to render at document.body level.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserMinus, X } from 'lucide-react';

interface KickToastProps {
  message: string | null;
  onClose: () => void;
}

const KickToast: React.FC<KickToastProps> = ({ message, onClose }) => {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (message) {
      console.log('[KickToast] Showing toast with message:', message);
      // Delay visible class by one frame so browser paints initial state first
      // This ensures the CSS transition animates properly
      const raf = requestAnimationFrame(() => {
        setVisible(true);
      });

      let animationTimer: ReturnType<typeof setTimeout> | null = null;

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        console.log('[KickToast] Auto-dismissing');
        setVisible(false);
        animationTimer = setTimeout(() => onCloseRef.current(), 300);
      }, 5000);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
        if (animationTimer) clearTimeout(animationTimer);
      };
    } else {
      setVisible(false);
    }
  }, [message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!message) return null;

  const handleClose = () => {
    console.log('[KickToast] Manual close');
    setVisible(false);
    // Clear any existing timer before setting new one
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => onCloseRef.current(), 300);
  };

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
