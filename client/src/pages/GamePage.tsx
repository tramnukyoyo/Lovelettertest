import React from 'react';
import HeartsGambitGame from '../components/hearts-gambit/HeartsGambitGame';
import type { Lobby } from '../types';
import type { Socket } from 'socket.io-client';

interface GamePageProps {
  lobby: Lobby;
  socket: Socket;
}

const GamePage: React.FC<GamePageProps> = ({ lobby, socket }) => {
  // Internal game state routing - handles all game phases
  switch (lobby.state) {
    // Heart's Gambit States
    case 'LOBBY':
    case 'PLAYING':
    case 'ENDED':
      return <HeartsGambitGame lobby={lobby} socket={socket} />;
      
    default:
      return <div>Unknown game state: {lobby.state}</div>;
  }
};

export default GamePage;
