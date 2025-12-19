import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

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

  const Icon = type === 'error' ? AlertCircle : CheckCircle;
  const tone = type === 'error'
    ? { bar: 'bg-[rgba(var(--primary-rgb),0.9)]', icon: 'text-[var(--royal-crimson-light)]' }
    : { bar: 'bg-[rgba(var(--accent-color-rgb),0.9)]', icon: 'text-[var(--royal-gold)]' };

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -50, x: '-50%' }}
      className="hg-panel hg-candlelight fixed top-4 left-1/2 -translate-x-1/2 text-[var(--parchment)] px-4 py-3 rounded-xl shadow-2xl z-[100001] flex items-center gap-3 min-w-[260px] max-w-[420px] overflow-hidden pointer-events-auto"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.bar}`} />
      <Icon className={`w-5 h-5 flex-shrink-0 ${tone.icon}`} />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>,
    document.body
  );
};

export default Toast;
