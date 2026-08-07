/**
 * The in-game action toast — "not your turn", "no cards left", "card played".
 *
 * It is the toast players see MOST, and until round 5 it was the one member
 * outside the `.ps-toast` family in DOM: a bare `text-sm font-medium` sentence
 * next to a lucide glyph, while the five rail members carry a typewriter
 * eyebrow + a Cinzel title. Its 4px leading rail was also the WRONG red —
 * `rgba(var(--primary-rgb),0.9)` resolves to the wax-seal maroon #6a1623, i.e.
 * near-black on a velvet ground, 12px away from an icon tinted with the
 * family's danger accent #8a2233. Two different reds on one card, with the
 * invisible one on the element that carries the meaning.
 *
 * It now wears the family skin (components/ui/toastRail.css): ground, gold
 * hairline, `::before` accent rail, 40px icon plate, eyebrow → title, and the
 * shared close control with its focus-visible ring. Only what is TRUE OF THIS
 * MEMBER ALONE stays here — it portals to <body> and pins itself centred
 * instead of queueing in the rail — and even that geometry is declared in
 * toastRail.css so one file owns where every toast in the game sits.
 *
 * `hg-panel hg-candlelight fixed top-4` are kept verbatim: they are the
 * capture-driver's DOM contract and the selector toastRail.css docks on.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { t } from '../../utils/translations';

/** t() returns the key itself on a miss, so `t(k) || fallback` NEVER fires. */
function tr(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

interface ToastProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isError = type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle;
  // Tone is a MODIFIER CLASS, never a colour: the family redefines
  // --ps-toast-accent and the rail, plate and eyebrow all follow it.
  const tone = isError ? 'ps-toast--danger' : 'ps-toast--reward';
  const [eyebrowKey, eyebrowFallback] = isError
    ? ['toast.category.blocked', 'Blocked']
    : ['toast.category.done', 'Done'];

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -50, x: '-50%' }}
      className={`ps-toast ${tone} hg-panel hg-candlelight fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto`}
      data-ps-toast="action"
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <span className="ps-toast__icon">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="ps-toast__body">
        <span className="ps-toast__eyebrow">{tr(eyebrowKey, eyebrowFallback)}</span>
        <span className="ps-toast__title">{message}</span>
      </div>
      <button
        type="button"
        className="ps-toast__close"
        onClick={onClose}
        aria-label={t('kickToast.close')}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </motion.div>,
    document.body
  );
};

export default Toast;
