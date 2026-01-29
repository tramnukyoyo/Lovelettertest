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

const BG_MAP: Record<string, string> = {
  info: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
  error: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
};

const SiteNotificationToast: React.FC<SiteNotificationToastProps> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 8000);
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
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 10002,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
      maxWidth: '90vw',
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 8,
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
          borderRadius: 6,
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
