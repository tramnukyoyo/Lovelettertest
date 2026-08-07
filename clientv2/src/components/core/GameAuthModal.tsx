/**
 * GameAuthModal — in-game login/signup WITHOUT leaving the game.
 *
 * Reuses the SettingsModal shell (backdrop/panel/header classes) and drives
 * services/supabaseAuth.ts: email/password + Google/Discord popup OAuth
 * against the SHARED platform session ('gamebuddies-auth'). On success the
 * service syncs the users row and live-upgrades the current room seat via
 * gb:auth:upgrade — this component only renders the flow.
 *
 * Canonical copy-paste source for other game clients (with supabaseAuth.ts
 * and auth-modal.css as a trio).
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, MailCheck, CheckCircle2 } from 'lucide-react';
import { t } from '../../utils/translations';
import { getTranslation } from '../../utils/gameTranslations';
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithOAuthPopup,
  setRememberMePreference,
  type AuthResult,
  type OAuthProvider,
} from '../../services/supabaseAuth';

interface GameAuthModalProps {
  onClose: () => void;
  /** Used by the popup-blocked redirect fallback to return to this room. */
  roomCode?: string;
  playerName?: string;
}

type Mode = 'signin' | 'signup';
type Phase = 'form' | 'pending-confirm' | 'success';

// Brand marks inline so the file stays copy-paste self-contained.
const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

const DiscordIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
    <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.27 18.27 0 0 0-5.5 0 12.6 12.6 0 0 0-.61-1.25.07.07 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.06.06 0 0 0-.03.02C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.12c.13-.1.25-.2.37-.3a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08 0c.12.11.25.21.37.31a.08.08 0 0 1 0 .12 12.3 12.3 0 0 1-1.88.9.08.08 0 0 0-.04.1c.36.7.78 1.37 1.23 2a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6.03-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.67a.06.06 0 0 0-.03-.02zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.22 0 2.18 1.1 2.16 2.42 0 1.34-.94 2.42-2.16 2.42z" />
  </svg>
);

const GameAuthModal: React.FC<GameAuthModalProps> = ({ onClose, roomCode, playerName }) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [phase, setPhase] = useState<Phase>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const busy = submitting || oauthLoading !== null;

  const handleResult = (result: AuthResult): void => {
    if (result.ok) {
      setPhase('success');
      setTimeout(onClose, 900);
      return;
    }
    if ('code' in result && result.code === 'pending-confirm') {
      setPhase('pending-confirm');
      return;
    }
    if ('code' in result && result.code === 'already-registered') {
      setMode('signin');
      setConfirmPassword('');
      setError(t('authModal.emailAlreadyRegistered'));
      return;
    }
    const msg = 'error' in result ? result.error : '';
    if (msg === 'redirecting') return; // popup blocked → page is navigating away
    if (msg === 'popup closed') {
      setError(t('authModal.popupClosed'));
      return;
    }
    setError(msg || t('authModal.authFailed'));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('authModal.fillAllFields'));
      return;
    }
    if (mode === 'signup') {
      if (password.length < 6) {
        setError(t('authModal.passwordMinLength'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('authModal.passwordsMismatch'));
        return;
      }
      if (!consent) {
        setError(t('authModal.consentRequired'));
        return;
      }
    }
    setSubmitting(true);
    try {
      setRememberMePreference(rememberMe);
      const result =
        mode === 'signup'
          ? await signUpWithPassword(email, password)
          : await signInWithPassword(email, password);
      handleResult(result);
    } catch (err) {
      setError((err as Error).message || t('authModal.authFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider): Promise<void> => {
    setError('');
    setOauthLoading(provider);
    try {
      setRememberMePreference(rememberMe);
      const result = await signInWithOAuthPopup(provider, { roomCode, playerName });
      handleResult(result);
    } catch (err) {
      setError((err as Error).message || t('authModal.authFailed'));
    } finally {
      setOauthLoading(null);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="settings-modal-backdrop"
        onClick={() => !busy && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="settings-modal auth-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="settings-modal-header">
            <div className="settings-modal-title">
              <span className="settings-modal-eyebrow">{getTranslation('game.caseFile')}</span>
              <h2>{mode === 'signup' ? t('authModal.titleSignup') : t('authModal.titleSignin')}</h2>
            </div>
            <button onClick={onClose} className="settings-modal-close" aria-label={t('common.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="settings-modal-content auth-modal-content">
            {phase === 'success' && (
              <div className="auth-modal-status">
                <CheckCircle2 className="auth-modal-status-icon" />
                <p>{t('authModal.successTitle')}</p>
              </div>
            )}

            {phase === 'pending-confirm' && (
              <div className="auth-modal-status">
                <MailCheck className="auth-modal-status-icon" />
                <p className="auth-modal-status-title">{t('authModal.pendingConfirmTitle')}</p>
                <p className="auth-modal-status-body">{t('authModal.pendingConfirmBody')}</p>
              </div>
            )}

            {phase === 'form' && (
              <>
                <p className="auth-modal-benefits">{t('authModal.benefits')}</p>

                <div className="auth-modal-tabs">
                  <button
                    type="button"
                    className={`auth-modal-tab ${mode === 'signin' ? 'active' : ''}`}
                    onClick={() => { setMode('signin'); setError(''); }}
                    disabled={busy}
                  >
                    {t('authModal.tabSignin')}
                  </button>
                  <button
                    type="button"
                    className={`auth-modal-tab ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => { setMode('signup'); setError(''); }}
                    disabled={busy}
                  >
                    {t('authModal.tabSignup')}
                  </button>
                </div>

                <div className="auth-modal-oauth">
                  <button
                    type="button"
                    className="auth-modal-oauth-btn"
                    onClick={() => handleOAuth('google')}
                    disabled={busy}
                  >
                    <GoogleIcon />
                    <span>{oauthLoading === 'google' ? t('authModal.submitting') : t('authModal.google')}</span>
                  </button>
                  <button
                    type="button"
                    className="auth-modal-oauth-btn"
                    onClick={() => handleOAuth('discord')}
                    disabled={busy}
                  >
                    <DiscordIcon />
                    <span>{oauthLoading === 'discord' ? t('authModal.submitting') : t('authModal.discord')}</span>
                  </button>
                </div>

                <div className="auth-modal-divider">
                  <span>{t('authModal.orEmail')}</span>
                </div>

                <form className="auth-modal-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    className="auth-modal-input"
                    placeholder={t('authModal.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={busy}
                  />
                  <input
                    type="password"
                    className="auth-modal-input"
                    placeholder={t('authModal.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    disabled={busy}
                  />
                  {mode === 'signup' && (
                    <>
                      <input
                        type="password"
                        className="auth-modal-input"
                        placeholder={t('authModal.confirmPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        disabled={busy}
                      />
                      <label className="auth-modal-check">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          disabled={busy}
                        />
                        <span>{t('authModal.consent')}</span>
                      </label>
                    </>
                  )}
                  <label className="auth-modal-check">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={busy}
                    />
                    <span>{t('authModal.rememberMe')}</span>
                  </label>

                  {error && <div className="auth-modal-error">{error}</div>}

                  <button type="submit" className="auth-modal-submit" disabled={busy}>
                    <LogIn size={16} />
                    <span>
                      {submitting
                        ? t('authModal.submitting')
                        : mode === 'signup'
                          ? t('authModal.submitSignup')
                          : t('authModal.submitSignin')}
                    </span>
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default GameAuthModal;
