/**
 * Join From Invite Modal
 *
 * Simplified modal shown when users click an invite link.
 * Only requires name input - room code is hidden.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X } from 'lucide-react';
import FloatingLabelInput from './FloatingLabelInput';
import { GAME_META } from '../../config/gameMeta';
import { t } from '../../utils/translations';

interface JoinFromInviteModalProps {
  inviteToken: string;
  onClose: () => void;
  onJoin: (playerName: string) => void;
  isConnecting?: boolean;
  error?: string | null;
}

const JoinFromInviteModal: React.FC<JoinFromInviteModalProps> = ({
  inviteToken: _inviteToken,
  onClose,
  onJoin,
  isConnecting = false,
  error
}) => {
  const [playerName, setPlayerName] = useState('');

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
          {/* Close button */}
          <button
            onClick={onClose}
            className="invite-modal-close"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Mascot */}
          <img
            src={`${import.meta.env.BASE_URL}mascot.webp`}
            alt={GAME_META.mascotAlt}
            className="invite-modal-mascot"
          />

          {/* Title */}
          <h2 className="invite-modal-title">
            {t('invite.title') || "You're Invited!"}
          </h2>
          <p className="invite-modal-subtitle">
            {t('invite.subtitle') || 'Enter your name to join the game'}
          </p>

          {/* Error */}
          {error && (
            <div className="invite-modal-error">
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
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
              <Users className="w-5 h-5" />
              {isConnecting ? t('common.loading') : t('invite.joinGame') || 'Join Game'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default JoinFromInviteModal;
