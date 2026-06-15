/**
 * Lobby Mini Chat
 *
 * Compact chat preview shown below the waiting card on desktop.
 * Displays last 3 messages with a compact input field.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import type { ChatMessage } from '../../types';
import socketService from '../../services/socketService';
import { t } from '../../utils/translations';

interface LobbyMiniChatProps {
  messages: ChatMessage[];
  roomCode: string;
  mySocketId: string;
  onOpenFullChat?: () => void;
}

const RATE_LIMIT_MS = 500;

const LobbyMiniChat: React.FC<LobbyMiniChatProps> = ({
  messages,
  roomCode,
  mySocketId,
  onOpenFullChat
}) => {
  const [inputValue, setInputValue] = useState('');
  const [lastSendTime, setLastSendTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastMessages = messages.slice(-3);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    const now = Date.now();
    if (now - lastSendTime < RATE_LIMIT_MS) return;

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('chat:message', { roomCode, message: text });
      setLastSendTime(now);
    }

    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, roomCode, lastSendTime]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="lobby-mini-chat">
      <div className="mini-chat-messages">
        {lastMessages.length === 0 ? (
          <div className="mini-chat-empty">
            <MessageCircle className="w-4 h-4" />
            <span>{t('chat.noMessages')}</span>
          </div>
        ) : (
          lastMessages.map((msg) => {
            const isMe = msg.playerId === mySocketId;
            const messageKey = msg.id || `${msg.timestamp}-${msg.playerId}`;

            if (msg.isSystem) {
              return (
                <div key={messageKey} className="mini-chat-msg system">
                  <span>{msg.message}</span>
                </div>
              );
            }

            return (
              <div key={messageKey} className={`mini-chat-msg ${isMe ? 'mine' : 'theirs'}`}>
                {!isMe && <span className="mini-chat-sender">{msg.playerName}</span>}
                <span className="mini-chat-text">{msg.message}</span>
                <span className="mini-chat-time">{formatTime(msg.timestamp)}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="mini-chat-input-row">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.typeMessage')}
          className="mini-chat-input"
          maxLength={200}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="mini-chat-send"
          aria-label={t('chat.sendMessage')}
        >
          <Send className="w-3 h-3" />
        </button>
      </div>

      {onOpenFullChat && (
        <button className="mini-chat-expand" onClick={onOpenFullChat} type="button">
          {t('chat.openFull')}
        </button>
      )}
    </div>
  );
};

export default LobbyMiniChat;
