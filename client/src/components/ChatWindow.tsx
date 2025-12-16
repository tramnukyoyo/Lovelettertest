import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage, Lobby } from '../types';

interface ChatWindowProps {
  socket: Socket;
  messages?: ChatMessage[];
  roomCode?: string;
  lobby?: Lobby;
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'sidebar' | 'default';
}

const ChatWindowComponent: React.FC<ChatWindowProps> = ({ socket, messages = [], isOpen: externalIsOpen }) => {
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : true;
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opening chat
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    socket.emit('chat:message', {
      message: trimmed,
    });

    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emojiClickData: EmojiClickData) => {
    setMessage((prev) => prev + emojiClickData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="chat-window flex-1 min-h-0 flex flex-col">
      <div className="chat-header">
        <h3>Chat</h3>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-message system-message">
            <div className="message-content">
              No messages yet. Start chatting with your teammate!
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.isSystem ? 'system-message' : ''}`}
            >
              {!msg.isSystem && (
                <div className="message-header">
                  <span className="message-sender">{msg.playerName}</span>
                  <span className="message-time">{formatTimestamp(msg.timestamp)}</span>
                </div>
              )}
              <div className="message-content">{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={Theme.DARK}
              width={280}
              height={280}
            />
          </div>
        )}

        <div className="chat-input-wrapper">
          <button
            className="emoji-button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            type="button"
            title="Add emoji"
          >
            😀
          </button>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            maxLength={500}
            className="chat-input"
          />
          <button
            className="send-button"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            title="Send"
            type="button"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
const ChatWindow = React.memo<ChatWindowProps>(ChatWindowComponent, (prevProps, nextProps) => {
  return prevProps.messages === nextProps.messages && prevProps.socket === nextProps.socket;
});

export default ChatWindow;
