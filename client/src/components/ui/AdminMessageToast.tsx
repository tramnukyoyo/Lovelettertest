import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Send, X } from 'lucide-react';
import './AdminMessageToast.css';

/**
 * AdminMessageToast — shows a message sent by a GameBuddies admin to a player
 * who is currently in a game, and lets the player reply without leaving.
 *
 * Delivery: the game server emits `admin:message` ({ threadId, body, fromName, at })
 * to this player's socket. Reply: App emits `admin:message:reply` ({ threadId, body }),
 * which the game server relays to the platform's existing message thread.
 *
 * Styling is class-based and themed entirely from the game's unified.css custom
 * properties (--bg-secondary, --gb-cyan, --text-primary, fonts, radius …), so the
 * window automatically matches whichever game it's dropped into. See AdminMessageToast.css.
 */
export interface AdminMessage {
  threadId: string | null;
  body: string;
  fromName: string;
  at: number;
}

interface Props {
  message: AdminMessage | null;
  onReply: (threadId: string | null, body: string) => void;
  onClose: () => void;
}

const AdminMessageToast: React.FC<Props> = ({ message, onReply, onClose }) => {
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (message) {
      setReply('');
      setSent(false);
      const t = setTimeout(() => taRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (!message) return null;

  const send = () => {
    const text = reply.trim();
    if (!text) return;
    onReply(message.threadId, text);
    setSent(true);
    setReply('');
  };

  return createPortal(
    <div className="gb-admsg" role="dialog" aria-label="Message from GameBuddies">
      <div className="gb-admsg-header">
        <MessageSquare className="gb-admsg-icon" size={18} />
        <strong className="gb-admsg-from">{message.fromName || 'GameBuddies'}</strong>
        <button className="gb-admsg-close" onClick={onClose} type="button" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="gb-admsg-body">
        <p className="gb-admsg-text">{message.body}</p>
        {sent ? (
          <p className="gb-admsg-sent">Reply sent ✓</p>
        ) : (
          <div className="gb-admsg-composer">
            <textarea
              ref={taRef}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Reply to GameBuddies…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button className="gb-admsg-send" onClick={send} type="button" disabled={!reply.trim()} aria-label="Send reply">
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AdminMessageToast;
