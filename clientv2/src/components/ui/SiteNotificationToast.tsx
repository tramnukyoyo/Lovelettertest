import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface SiteNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target: string;
}

interface SiteNotificationToastProps {
  notification: SiteNotification | null;
  onClose: () => void;
}

const ICON_MAP = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

// Solid prairie-palette fills (pixel theme: no gradients, no teal)
const BG_MAP: Record<string, string> = {
  info: '#3b2417',
  success: '#4cc66a',
  warning: '#e0763c',
  error: '#e05252',
};

const SiteNotificationToast: React.FC<SiteNotificationToastProps> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const Icon = ICON_MAP[notification.type] || Info;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-100px)',
      background: BG_MAP[notification.type] || BG_MAP.info,
      color: 'white',
      padding: '16px 20px',
      borderRadius: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '4px 4px 0 rgba(20, 10, 4, 0.55)',
      zIndex: 10002,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
      maxWidth: 'min(340px, 85vw)',
      width: 'auto',
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 0,
        display: 'flex',
        alignItems: 'center',
      }}>
        <Icon style={{ width: 20, height: 20 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{notification.title}</span>
        <span style={{ fontSize: 13, opacity: 0.9 }}>{notification.message}</span>
      </div>
      <button
        onClick={handleClose}
        type="button"
        aria-label="Close notification"
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: 4,
          borderRadius: 0,
          cursor: 'pointer',
          display: 'flex',
          marginLeft: 4,
        }}
      >
        <X style={{ width: 16, height: 16 }} />
      </button>
    </div>,
    document.body
  );
};

export default SiteNotificationToast;
