/**
 * Chat Window
 *
 * Real-time chat component for lobby and game.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, X } from 'lucide-react';
import type { ChatMessage } from '../../types';
import socketService from '../../services/socketService';
import { useTypewriterSound } from '../../hooks';
import { t } from '../../utils/translations';

interface ChatWindowProps {
  messages: ChatMessage[];
  roomCode: string;
  mySocketId: string;
  mode?: 'sidebar' | 'floating';
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

// Rate limiting constants
const RATE_LIMIT_MS = 500; // 500ms between messages

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  roomCode,
  mySocketId,
  mode = 'sidebar',
  isOpen = true,
  onClose,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  const [lastSendTime, setLastSendTime] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTypewriterSound = useTypewriterSound();

  // Cleanup rate limit timer on unmount
  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
    };
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    // Rate limiting - prevent spam
    const now = Date.now();
    if (now - lastSendTime < RATE_LIMIT_MS) {
      // Show rate limit feedback
      setIsRateLimited(true);
      if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
      rateLimitTimerRef.current = setTimeout(() => setIsRateLimited(false), 1000);
      return;
    }

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('chat:message', { roomCode, message: text });
      setLastSendTime(now);
    }

    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, roomCode, lastSendTime]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Play typewriter sound for all keys
    playTypewriterSound(e);

    // Send on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen && mode === 'floating') {
    return null;
  }

  const content = (
    <div className={`chat-window ${mode} ${className}`}>
      {/* Header */}
      <div className="chat-header">
        <h3 className="chat-title">{t('chat.title')}</h3>
        {mode === 'floating' && onClose && (
          <button onClick={onClose} className="chat-close-btn" aria-label={t('chat.closeChat')}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            {/* Empty state = a quiet dossier ghost, never a blank box: a
                watermark print above three unwritten ruled lines. Decoration
                only — aria-hidden, no pointer events (chat.css). */}
            <span className="chat-empty-seal" aria-hidden="true">
              <svg viewBox="0 0 40 40" width="52" height="52" fill="none"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" focusable="false">
                <path d="M20 34c-4-3-6-7.5-6-12a6 6 0 0 1 12 0c0 3-.6 6-2 8.6" />
                <path d="M20 30c-2-2.4-3-5-3-8a3 3 0 0 1 6 0c0 2-.3 3.6-.9 5" />
                <path d="M9.6 26.6A16 16 0 0 1 8 20a12 12 0 0 1 24 0c0 4-.8 7.8-2.4 11" />
                <path d="M20 4.6A15.4 15.4 0 0 0 6.6 12" />
                <path d="M33.4 12A15.4 15.4 0 0 0 24.6 5.2" />
              </svg>
            </span>
            <p>{t('chat.noMessages')}</p>
            <p className="chat-empty-hint">{t('chat.sayHello')}</p>
            <span className="chat-empty-rules" aria-hidden="true">
              <i /><i /><i />
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.playerId === mySocketId;
            // Use message ID for stable key, fallback to timestamp+playerId for backwards compatibility
            const messageKey = msg.id || `${msg.timestamp}-${msg.playerId}`;

            if (msg.isSystem) {
              return (
                <div key={messageKey} className="chat-message system">
                  <span className="chat-message-text">{msg.message}</span>
                </div>
              );
            }

            return (
              <div
                key={messageKey}
                className={`chat-message ${isMe ? 'mine' : 'theirs'}`}
              >
                {!isMe && (
                  <span className="chat-message-sender">{msg.playerName}</span>
                )}
                <div className="chat-message-bubble">
                  <span className="chat-message-text">{msg.message}</span>
                  <span className="chat-message-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRateLimited ? t('chat.slowDown') : t('chat.typeMessage')}
          className={`chat-input ${isRateLimited ? 'rate-limited' : ''}`}
          maxLength={200}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isRateLimited}
          className="chat-send-btn"
          aria-label={t('chat.sendMessage')}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Use portal for floating mode to escape stacking context issues
  if (mode === 'floating') {
    return createPortal(content, document.body);
  }

  return content;
};

// memo: parent pages re-render on every roomStateUpdated tick; chat only needs
// to re-render when its own props (messages, room, open-state) change.
export default React.memo(ChatWindow);
