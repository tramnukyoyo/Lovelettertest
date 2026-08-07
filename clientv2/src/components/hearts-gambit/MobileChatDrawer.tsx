import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Smile } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage } from '../../types';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';

interface MobileChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  socket: Socket;
  mySocketId?: string;
}

/* Owner rule: no emoji as UI chrome. The drawer header used 💬 and the empty
   state a 🕵️ — both rendered as full-colour system glyphs inside gold case-file
   chips. These are the same line-art marks the desktop rail uses
   (SidebarTabs.tsx CaseNotesIcon / ChatWindow's fingerprint seal), so the phone
   drawer and the desktop CHAT tab now speak ONE visual language. */
const CaseNotesMark = () => (
  <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="square" aria-hidden="true" focusable="false">
    <path d="M2.2 2.4h11.6v8.4H7.6L4.3 13.6v-2.8H2.2z" />
    <path d="M4.9 5.6h6.2M4.9 8h4.2" />
  </svg>
);

const CaseSealMark = () => (
  <svg viewBox="0 0 40 40" width="34" height="34" fill="none" stroke="currentColor"
    strokeWidth="1.2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M20 34c-4-3-6-7.5-6-12a6 6 0 0 1 12 0c0 3-.6 6-2 8.6" />
    <path d="M20 30c-2-2.4-3-5-3-8a3 3 0 0 1 6 0c0 2-.3 3.6-.9 5" />
    <path d="M9.6 26.6A16 16 0 0 1 8 20a12 12 0 0 1 24 0c0 4-.8 7.8-2.4 11" />
    <path d="M20 4.6A15.4 15.4 0 0 0 6.6 12" />
    <path d="M33.4 12A15.4 15.4 0 0 0 24.6 5.2" />
  </svg>
);

/**
 * Full-screen chat drawer for mobile.
 * Noir-styled to match the HeartsGambit theme.
 */
const MobileChatDrawer: React.FC<MobileChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  socket,
  mySocketId,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Translation helper
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  // Common emojis for quick access
  const quickEmojis = ['😀', '😂', '🤔', '😎', '👍', '👎', '❤️', '🔥', '🎉', '💀', '🕵️', '🃏'];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    socket.emit('chat:message', { message: trimmed });
    setInputValue('');
    setShowEmojis(false);
  }, [inputValue, socket]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-[99999]"
            onClick={onClose}
          />

          {/* Chat drawer - slides up from bottom */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 top-0 z-[100000] flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            {/* Noir-styled container */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-[#1a0f1e] to-[#0d0610] border-t border-[rgba(212,175,55,0.3)]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(212,175,55,0.2)] bg-[rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.2)] flex items-center justify-center text-[var(--royal-gold-light)]">
                    <CaseNotesMark />
                  </div>
                  <div>
                    <h2 className="text-[var(--royal-gold-light)] font-bold text-sm uppercase tracking-wider">
                      {t('caseNotes.chat')}
                    </h2>
                    <p className="text-[var(--parchment-dark)] text-xs">
                      {t('chat.messageCount').replace('{count}', String(messages.length))}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="hg-icon-btn w-10 h-10 flex items-center justify-center rounded-xl bg-[rgba(var(--accent-color-rgb),0.2)] hover:bg-[rgba(var(--accent-color-rgb),0.3)] transition-colors"
                  aria-label={t('chat.closeChat')}
                >
                  <X size={20} color="var(--parchment)" />
                </button>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="chat-empty flex flex-col items-center justify-center h-full text-center py-12">
                    {/* quiet on-theme ghost, not a blank box: watermark seal over
                        three unwritten ruled lines — identical to the desktop rail's
                        CHAT empty state (styles/components/chat.css). */}
                    <span className="chat-empty-seal mb-4" aria-hidden="true">
                      <CaseSealMark />
                    </span>
                    <p className="text-[var(--parchment-dark)] text-sm italic">
                      {t('chat.noMessagesYet')}
                    </p>
                    <p className="text-[var(--parchment-dark)] text-xs mt-1 opacity-70">
                      {t('chat.startInvestigation')}
                    </p>
                    <span className="chat-empty-rules" aria-hidden="true">
                      <i /><i /><i />
                    </span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.playerId === mySocketId;
                    const isSystem = msg.isSystem;

                    if (isSystem) {
                      return (
                        <div
                          key={msg.id}
                          className="flex justify-center"
                        >
                          <div className="bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] rounded-lg px-3 py-1.5 max-w-[85%]">
                            <p className="text-[var(--royal-gold-light)] text-xs italic text-center">
                              {msg.message}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? 'bg-[rgba(139,90,43,0.4)] border border-[rgba(212,175,55,0.3)] rounded-br-md'
                              : 'bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] rounded-bl-md'
                          }`}
                        >
                          {!isMe && (
                            <p className="text-[var(--royal-gold-light)] text-xs font-semibold mb-0.5">
                              {msg.playerName}
                            </p>
                          )}
                          <p className="text-[var(--parchment)] text-sm break-words">
                            {msg.message}
                          </p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-right' : 'text-left'} text-[var(--parchment-dark)] opacity-70`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick emoji bar */}
              <AnimatePresence>
                {showEmojis && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-[rgba(212,175,55,0.15)]"
                  >
                    <div className="flex flex-wrap gap-2 px-4 py-3 bg-[rgba(0,0,0,0.2)]">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => addEmoji(emoji)}
                          className="w-10 h-10 flex items-center justify-center text-xl hover:bg-[rgba(212,175,55,0.2)] rounded-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input area */}
              <div
                className="border-t border-[rgba(212,175,55,0.2)] bg-[rgba(0,0,0,0.4)] px-3 py-3"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)' }}
              >
                <div className="flex items-center gap-2">
                  {/* Emoji toggle */}
                  <button
                    onClick={() => setShowEmojis(!showEmojis)}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
                      showEmojis
                        ? 'bg-[rgba(212,175,55,0.3)] text-[var(--royal-gold-light)]'
                        : 'bg-[rgba(var(--accent-color-rgb),0.2)] text-[var(--parchment)]'
                    }`}
                  >
                    <Smile size={20} />
                  </button>

                  {/* Input field */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('chat.typeMessage')}
                    maxLength={500}
                    className="flex-1 h-11 px-4 rounded-xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-[var(--parchment)] placeholder-[var(--parchment-dark)] text-sm focus:outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors"
                  />

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                      inputValue.trim()
                        ? 'bg-[var(--royal-gold)] text-[var(--velvet-dark)] hover:bg-[#e5c547]'
                        : 'bg-[rgba(var(--accent-color-rgb),0.2)] text-[var(--parchment-dark)] opacity-50'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MobileChatDrawer;
