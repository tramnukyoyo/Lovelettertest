/**
 * Feedback Modal ("Report a problem")
 *
 * Lets a player submit a bug report / idea / other feedback from inside a game.
 * The message is sent over the game socket; the server attaches the room code +
 * a full room/game/player state snapshot and stores it in the shared feedback
 * table (visible in the GameBuddies /admin/feedback dashboard).
 *
 * Mirrors SettingsModal (portal + framer-motion). Mobile-friendly: the modal
 * goes full-screen on small viewports via feedback-modal CSS.
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Lightbulb, MessageSquare, Send, Loader2, CheckCircle2, Hash } from 'lucide-react';
import type { Lobby } from '../../types';
import socketService from '../../services/socketService';
import { loadSession } from '../../services/gameBuddiesSession';
import { t } from '../../utils/translations';

interface FeedbackModalProps {
  /** Present when reporting from inside a game; omit on the home screen. */
  lobby?: Lobby | null;
  onClose: () => void;
}

type ReportType = 'bug' | 'idea' | 'other';
const MAX_MESSAGE = 1000;
const MIN_MESSAGE = 5;

const FeedbackModal: React.FC<FeedbackModalProps> = ({ lobby, onClose }) => {
  const [reportType, setReportType] = useState<ReportType>('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const showRoom = !!lobby && !(lobby.hideRoomCode || lobby.isStreamerMode);

  const types: Array<{ id: ReportType; icon: typeof Bug; label: string }> = [
    { id: 'bug', icon: Bug, label: t('feedback.typeBug') },
    { id: 'idea', icon: Lightbulb, label: t('feedback.typeIdea') },
    { id: 'other', icon: MessageSquare, label: t('feedback.typeOther') },
  ];

  const canSubmit = message.trim().length >= MIN_MESSAGE && !submitting;

  const handleSubmit = useCallback(() => {
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE || submitting) return;
    setSubmitting(true);
    setStatus('idle');

    // GameBuddies session identity — lets logged-in users be named even from the
    // home screen (no room yet). Absent = anonymous.
    const session = loadSession();

    socketService.submitFeedback(
      {
        reportType,
        message: trimmed,
        clientContext: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          path: window.location.pathname,
          roomCode: lobby?.code,
          reporterName: session?.playerName,
          reporterUserId: session?.userId,
        },
      },
      (res) => {
        setSubmitting(false);
        if (res?.success) {
          setStatus('success');
          setTimeout(() => onClose(), 1800);
        } else {
          setStatus('error');
        }
      },
    );
  }, [message, submitting, reportType, lobby, onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="feedback-modal-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="feedback-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="feedback-modal-header">
            <h2 className="feedback-modal-title">{t('feedback.title')}</h2>
            <button onClick={onClose} className="feedback-modal-close" aria-label={t('common.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {status === 'success' ? (
            <div className="feedback-modal-success">
              <CheckCircle2 className="feedback-modal-success-icon" />
              <div className="feedback-modal-success-title">{t('feedback.successTitle')}</div>
              <div className="feedback-modal-success-body">{t('feedback.successBody')}</div>
            </div>
          ) : (
            <div className="feedback-modal-content">
              <p className="feedback-modal-intro">{t('feedback.intro')}</p>

              {/* Type chips */}
              <div className="feedback-type-row" role="group">
                {types.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setReportType(type.id)}
                      className={`feedback-type-chip ${reportType === type.id ? 'active' : ''} ${type.id}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Message */}
              <textarea
                className="feedback-modal-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                placeholder={t('feedback.messagePlaceholder')}
                rows={5}
                maxLength={MAX_MESSAGE}
                autoFocus
              />
              <div className="feedback-modal-charcount">{message.length}/{MAX_MESSAGE}</div>

              {/* Room + state note (in-game only; home screen has no room/state) */}
              {showRoom && (
                <div className="feedback-modal-context">
                  <span className="feedback-modal-room">
                    <Hash className="w-3.5 h-3.5" />
                    {t('feedback.roomLabel')} {lobby!.code}
                  </span>
                  <span className="feedback-modal-note">{t('feedback.stateAttachedNote')}</span>
                </div>
              )}

              {status === 'error' && (
                <div className="feedback-modal-error">{t('feedback.errorMsg')}</div>
              )}

              {/* Submit */}
              <button
                type="button"
                className="feedback-modal-submit"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 feedback-spin" /> {t('feedback.sending')}</>
                ) : (
                  <><Send className="w-4 h-4" /> {t('feedback.submit')}</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

export default FeedbackModal;
