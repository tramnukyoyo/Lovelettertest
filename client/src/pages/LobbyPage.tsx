import React from 'react';
import Lobby from '../components/Lobby';
import type { Lobby as LobbyType } from '../types';
import type { Socket } from 'socket.io-client';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';

interface LobbyPageProps {
  lobby: LobbyType;
  socket: Socket;
  gameBuddiesSession?: GameBuddiesSession | null;
}

const LobbyPage: React.FC<LobbyPageProps> = ({ lobby, socket, gameBuddiesSession }) => {
  return <Lobby lobby={lobby} socket={socket} gameBuddiesSession={gameBuddiesSession} />;
};

export default LobbyPage;
