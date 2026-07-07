/**
 * Join modal shown right after a successful QR scan (live or photo mode).
 *
 * Scan → this modal (room code visible, name input) → Join = the actual
 * room:join. Previously a scan only prefilled the HomePage join form, which
 * looked like "nothing happened" on a phone — this makes the scanned join a
 * single explicit step.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanLine } from 'lucide-react';
import FloatingLabelInput from '../core/FloatingLabelInput';
import { GAME_META } from '../../config/gameMeta';
import { t } from '../../utils/translations';

interface JoinScannedRoomModalProps {
  roomCode: string;
  onClose: () => void;
  onJoin: (playerName: string) => void;
  isConnecting?: boolean;
  error?: string | null;
  /** Prefill (platform session / previously typed name), if known. */
  initialName?: string;
}

const JoinScannedRoomModal: React.FC<JoinScannedRoomModalProps> = ({
  roomCode,
  onClose,
  onJoin,
  isConnecting = false,
  error,
  initialName = '',
}) => {
  const [playerName, setPlayerName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && !isConnecting) {
      onJoin(playerName.trim());
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="invite-modal-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="invite-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="invite-modal-close"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={`${import.meta.env.BASE_URL}mascot.webp`}
            alt={GAME_META.mascotAlt}
            className="invite-modal-mascot"
          />

          <h2 className="invite-modal-title">
            <ScanLine className="w-5 h-5" /> {t('scanQr.joinTitle')}
          </h2>
          <p className="invite-modal-subtitle">
            {t('scanQr.joinSubtitle', { code: roomCode })}
          </p>
          <p className="invite-modal-roomcode" aria-label={roomCode}>{roomCode}</p>

          {error && (
            <div className="invite-modal-error">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="invite-modal-form">
            <FloatingLabelInput
              label={t('home.yourName')}
              value={playerName}
              onChange={setPlayerName}
              placeholder={t('home.enterName')}
              maxLength={20}
              required
            />
            <button
              type="submit"
              disabled={isConnecting || !playerName.trim()}
              className="invite-modal-btn"
            >
              {isConnecting ? t('common.loading') : t('scanQr.joinCta')}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default JoinScannedRoomModal;
