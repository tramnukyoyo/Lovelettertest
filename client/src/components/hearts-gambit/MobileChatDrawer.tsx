import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Smile } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage } from '../../types';

interface MobileChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  socket: Socket;
  mySocketId?: string;
}

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
                  <div className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.2)] flex items-center justify-center">
                    <span className="text-lg">💬</span>
                  </div>
                  <div>
                    <h2 className="text-[var(--royal-gold)] font-bold text-sm uppercase tracking-wider">
                      Case File Chat
                    </h2>
                    <p className="text-[var(--parchment-dark)] text-xs">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="hg-icon-btn w-10 h-10 flex items-center justify-center rounded-xl bg-[rgba(var(--accent-color-rgb),0.2)] hover:bg-[rgba(var(--accent-color-rgb),0.3)] transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5 text-[var(--parchment)]" />
                </button>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[rgba(212,175,55,0.1)] flex items-center justify-center mb-4">
                      <span className="text-3xl">🕵️</span>
                    </div>
                    <p className="text-[var(--parchment-dark)] text-sm italic">
                      No messages yet...
                    </p>
                    <p className="text-[var(--parchment-dark)] text-xs mt-1 opacity-70">
                      Start the investigation by sending a message!
                    </p>
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
                            <p className="text-[var(--royal-gold)] text-xs italic text-center">
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
                            <p className="text-[var(--royal-gold)] text-xs font-semibold mb-0.5">
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
                        ? 'bg-[rgba(212,175,55,0.3)] text-[var(--royal-gold)]'
                        : 'bg-[rgba(var(--accent-color-rgb),0.2)] text-[var(--parchment)]'
                    }`}
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Input field */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
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
                    <Send className="w-5 h-5" />
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
