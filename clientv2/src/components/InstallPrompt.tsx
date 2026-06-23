import { useState, useEffect } from 'react';
import { isInStandaloneMode, isIOSSafari, dismissInstallPrompt } from '../utils/pwaUtils';
import { t } from '../utils/translations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);

  useEffect(() => {
    // Don't show anything if already in standalone mode
    if (isInStandaloneMode()) return;

    // Only show install prompt on mobile/tablet devices
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    if (!isMobileDevice) return;

    // Check if prompt was dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) return;

    // iOS Safari: Show custom instructions after delay
    if (isIOSSafari()) {
      const timer = setTimeout(() => {
        setShowIOSPrompt(true);
      }, 4000); // 4 second delay
      return () => clearTimeout(timer);
    }

    // Android/Desktop: Listen for beforeinstallprompt
    let androidTimer: ReturnType<typeof setTimeout> | null = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom prompt after delay
      androidTimer = setTimeout(() => {
        setShowAndroidPrompt(true);
      }, 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (androidTimer) clearTimeout(androidTimer);
    };
  }, []);

  const handleDismiss = () => {
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
  };

  const handleDontShowAgain = () => {
    dismissInstallPrompt();
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidPrompt(false);
    }
    setDeferredPrompt(null);
  };

  // iOS Install Prompt
  if (showIOSPrompt) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <button style={styles.closeButton} onClick={handleDismiss}>
            <CloseIcon />
          </button>

          <h2 style={styles.title}>{t('installPrompt.title')}</h2>
          <p style={styles.subtitle}>{t('installPrompt.iosSubtitle')}</p>

          <div style={styles.steps}>
            <div style={styles.step}>
              <span style={styles.stepNumber}>1</span>
              <span>{t('installPrompt.iosStep1Prefix')} <ShareIcon /> {t('installPrompt.iosStep1Suffix')}</span>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNumber}>2</span>
              <span>{t('installPrompt.iosStep2')}</span>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNumber}>3</span>
              <span>{t('installPrompt.iosStep3')}</span>
            </div>
          </div>

          <button style={styles.dontShowButton} onClick={handleDontShowAgain}>
            {t('installPrompt.dontShowAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Android Install Prompt
  if (showAndroidPrompt && deferredPrompt) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <button style={styles.closeButton} onClick={handleDismiss}>
            <CloseIcon />
          </button>

          <h2 style={styles.title}>{t('installPrompt.title')}</h2>
          <p style={styles.subtitle}>{t('installPrompt.androidSubtitle')}</p>

          <button style={styles.installButton} onClick={handleAndroidInstall}>
            {t('installPrompt.installApp')}
          </button>

          <button style={styles.dontShowButton} onClick={handleDontShowAgain}>
            {t('installPrompt.dontShowAgain')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Simple SVG Icons
function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Inline styles (pixel prairie theme)
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#2a1a10',
    borderRadius: 0,
    padding: '24px',
    maxWidth: '340px',
    width: '100%',
    position: 'relative',
    border: '2px solid #6b4226',
    boxShadow: '8px 8px 0 rgba(20, 10, 4, 0.45)',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#cda57e',
    cursor: 'pointer',
    padding: '4px',
  },
  title: {
    color: '#f7e7c5',
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    color: '#cda57e',
    fontSize: '14px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#f7e7c5',
    fontSize: '14px',
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    borderRadius: 0,
    backgroundColor: '#ffb648',
    boxShadow: '1px 1px 0 #160b04',
    color: '#1d1009',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  installButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#ffb648',
    color: '#1d1009',
    border: 'none',
    borderRadius: 0,
    boxShadow: '2px 2px 0 #160b04',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '12px',
  },
  dontShowButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    color: '#cda57e',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
  },
};

export default InstallPrompt;
