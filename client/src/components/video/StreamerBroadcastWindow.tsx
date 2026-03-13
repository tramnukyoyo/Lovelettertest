/**
 * Streamer Broadcast Window - Prime Suspect
 *
 * Portal wrapper that opens a 1280x720 popup window (OBS-capturable) and
 * renders StreamerBroadcastContent inside it via React portal.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Socket } from 'socket.io-client';
import StreamerBroadcastContent from './StreamerBroadcastContent';
import { useVideoUI } from '../../contexts/VideoUIContext';
import type { WebcamPlayer } from '../../config/WebcamConfig';
import type { Lobby } from '../../types';
import { GAME_META } from '../../config/gameMeta';
import { getBroadcastCopy } from './broadcastCopy';

interface StreamerBroadcastWindowProps {
  lobby: Lobby;
  players: WebcamPlayer[];
  localPlayerName?: string;
  mySocketId?: string;
  socket: Socket;
  onOpen?: () => void;
  onClose?: () => void;
}

const StreamerBroadcastWindow: React.FC<StreamerBroadcastWindowProps> = ({
  lobby,
  players,
  localPlayerName,
  mySocketId,
  socket,
  onOpen,
  onClose
}) => {
  const { setOnBroadcastRequested, setStreamerBroadcastOpen } = useVideoUI();
  const copy = getBroadcastCopy();
  const [broadcastWindow, setBroadcastWindow] = useState<Window | null>(null);
  const [broadcastContainer, setBroadcastContainer] = useState<HTMLElement | null>(null);
  const windowRef = useRef<Window | null>(null);

  const openBroadcast = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus();
      return;
    }

    const width = 1280;
    const height = 720;
    const left = Math.max(0, (screen.width - width) / 2);
    const top = Math.max(0, (screen.height - height) / 2);

    const newWindow = window.open(
      '',
      'StreamerBroadcastWindow',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,toolbar=no,menubar=no,scrollbars=no`
    );

    if (!newWindow) {
      console.error('[StreamerBroadcastWindow] Failed to open window (popup blocked?)');
      return;
    }

    windowRef.current = newWindow;

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#ffb74d';
    const panelBg = getComputedStyle(document.documentElement).getPropertyValue('--panel-bg') || '#0a0a14';
    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#ffffff';
    const resolvedBaseHref = new URL(import.meta.env.BASE_URL || '/', window.location.href).toString();

    newWindow.document.open();
    newWindow.document.write(`
<!DOCTYPE html>
<html lang="${copy.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${resolvedBaseHref}">
  <title>${GAME_META.namePrefix}${GAME_META.nameAccent} - ${copy.content.windowTitle}</title>
  <style>
    :root {
      --accent-color: ${accentColor};
      --panel-bg: ${panelBg};
      --text-primary: ${textPrimary};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a14;
      color: ${textPrimary};
      height: 100vh;
      overflow: hidden;
    }
    #streamer-broadcast-root {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
  <div id="streamer-broadcast-root"></div>
</body>
</html>
    `);
    newWindow.document.close();

    newWindow.document.documentElement.setAttribute(
      'data-theme',
      document.documentElement.getAttribute('data-theme') || ''
    );
    newWindow.document.documentElement.className = document.documentElement.className;
    newWindow.document.documentElement.style.cssText = document.documentElement.style.cssText;
    newWindow.document.body.className = document.body.className;
    newWindow.document.body.style.cssText = document.body.style.cssText;

    const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
    parentStyles.forEach(style => {
      try {
        const clone = style.cloneNode(true);
        newWindow.document.head.appendChild(clone);
      } catch {
        // Ignore cross-origin stylesheet errors
      }
    });

    const container = newWindow.document.getElementById('streamer-broadcast-root');
    if (container) {
      setBroadcastContainer(container);
      setBroadcastWindow(newWindow);
      setStreamerBroadcastOpen(true);
      onOpen?.();
    }

    newWindow.onbeforeunload = () => {
      setBroadcastWindow(null);
      setBroadcastContainer(null);
      windowRef.current = null;
      setStreamerBroadcastOpen(false);
      onClose?.();
    };
  }, [copy.content.windowTitle, copy.lang, onOpen, onClose, setStreamerBroadcastOpen]);

  const closeBroadcast = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.close();
    }
    setBroadcastWindow(null);
    setBroadcastContainer(null);
    windowRef.current = null;
    setStreamerBroadcastOpen(false);
    onClose?.();
  }, [onClose, setStreamerBroadcastOpen]);

  useEffect(() => {
    setOnBroadcastRequested(() => openBroadcast);
    return () => {
      setOnBroadcastRequested(null);
    };
  }, [openBroadcast, setOnBroadcastRequested]);

  useEffect(() => {
    return () => {
      if (windowRef.current && !windowRef.current.closed) {
        windowRef.current.close();
      }
    };
  }, []);

  if (!broadcastContainer || !broadcastWindow || broadcastWindow.closed) {
    return null;
  }

  return createPortal(
    <StreamerBroadcastContent
      lobby={lobby}
      players={players}
      localPlayerName={localPlayerName}
      mySocketId={mySocketId}
      socket={socket}
      onClose={closeBroadcast}
    />,
    broadcastContainer
  );
};

export { StreamerBroadcastWindow };
export default StreamerBroadcastWindow;
