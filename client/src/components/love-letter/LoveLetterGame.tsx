import React, { useState } from 'react';
import type { Lobby, CardType } from '../../types';
import type { Socket } from 'socket.io-client';
import { User, Shield, Crown, Skull } from 'lucide-react';

interface LoveLetterGameProps {
  lobby: Lobby;
  socket: Socket;
}

const CARD_NAMES: Record<number, string> = {
  0: "Card Back",
  1: "Guard",
  2: "Priest",
  3: "Baron",
  4: "Handmaid",
  5: "Prince",
  6: "King",
  7: "Countess",
  8: "Princess"
};

const CARD_DESCRIPTIONS: Record<number, string> = {
  1: "Guess a player's hand (non-Guard).",
  2: "Look at a player's hand.",
  3: "Compare hands; lower value is out.",
  4: "Immune until next turn.",
  5: "One player discards hand.",
  6: "Trade hands.",
  7: "Must discard if with King/Prince.",
  8: "If discarded, you lose."
};

const LoveLetterGame: React.FC<LoveLetterGameProps> = ({ lobby, socket }) => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [guessCard, setGuessCard] = useState<CardType | null>(null);
  
  const me = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isMyTurn = lobby.gameData?.currentTurn === me?.id;
  const myHand = me?.hand || [];

  const handlePlayCard = () => {
    if (!selectedCard) return;

    // Validation before emit?
    const needsTarget = [1, 2, 3, 5, 6].includes(selectedCard);
    const needsGuess = selectedCard === 1;

    if (needsTarget && !targetId) {
      alert("Please select a target player.");
      return;
    }
    if (needsGuess && !guessCard) {
      alert("Please guess a card.");
      return;
    }

    socket.emit('play:card', {
      card: selectedCard,
      targetId: targetId,
      guess: guessCard
    });

    // Reset local state
    setSelectedCard(null);
    setTargetId(null);
    setGuessCard(null);
  };

  const getCardStyle = (card: CardType) => {
    switch (card) {
      case 8: return 'bg-pink-200 border-pink-400 text-pink-900';
      case 7: return 'bg-red-200 border-red-400 text-red-900';
      case 6: return 'bg-yellow-200 border-yellow-400 text-yellow-900';
      case 5: return 'bg-orange-200 border-orange-400 text-orange-900';
      case 4: return 'bg-blue-200 border-blue-400 text-blue-900';
      case 3: return 'bg-green-200 border-green-400 text-green-900';
      case 2: return 'bg-purple-200 border-purple-400 text-purple-900';
      case 1: return 'bg-gray-200 border-gray-400 text-gray-900';
      default: return 'bg-gray-300 border-gray-500 text-gray-800';
    }
  };

  if (!lobby.gameData) return <div>Loading Game Data...</div>;

  return (
    <div className="flex flex-col h-screen bg-amber-50 p-4 font-sans text-slate-800 overflow-hidden">
      
      {/* Header Info */}
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
        <div>
           <h1 className="text-xl font-bold text-amber-800">Love Letter</h1>
           <span className="text-sm text-gray-500">Room: {lobby.code} | Round: {lobby.gameData.currentRound}</span>
        </div>
        <div className="text-right">
           <div className="text-lg font-semibold">
              Deck: {lobby.gameData.deckCount} cards
           </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Opponents Row */}
        <div className="flex justify-center gap-4 flex-wrap">
          {lobby.players.filter(p => p.id !== me?.id).map(player => (
            <div 
              key={player.id} 
              className={`
                relative p-4 rounded-xl border-2 w-48 transition-all
                ${lobby.gameData?.currentTurn === player.id ? 'border-amber-500 shadow-lg scale-105 bg-amber-50' : 'border-gray-200 bg-white'}
                ${player.isEliminated ? 'opacity-50 grayscale' : ''}
                ${targetId === player.id ? 'ring-4 ring-blue-400' : ''}
                ${player.isImmune ? 'border-blue-300 bg-blue-50' : ''}
              `}
              onClick={() => !player.isEliminated && player.isImmune === false && player.id ? setTargetId(player.id) : null}
            >
              <div className="flex items-center gap-2 mb-2">
                 {player.avatarUrl ? <img src={player.avatarUrl} className="w-8 h-8 rounded-full" /> : <User className="w-6 h-6" />}
                 <span className="font-bold truncate">{player.name}</span>
                 {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
              </div>
              
              <div className="space-y-1 text-sm">
                 <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-500 inline-block"></span>
                    <span>Tokens: {player.tokens}</span>
                 </div>
                 <div>Hand: {player.handCount} card(s)</div>
                 {player.isImmune && <div className="flex items-center text-blue-600 gap-1"><Shield className="w-3 h-3"/> Immune</div>}
                 {player.isEliminated && <div className="flex items-center text-red-600 gap-1"><Skull className="w-3 h-3"/> Eliminated</div>}
              </div>

              {/* Discard Pile (Last played) */}
              <div className="mt-2 text-xs text-gray-500">
                Last: {player.discarded.length > 0 ? CARD_NAMES[player.discarded[player.discarded.length-1]] : 'None'}
              </div>
            </div>
          ))}
        </div>

        {/* Action Area / Log */}
        <div className="flex-1 bg-white rounded-lg shadow-inner p-4 overflow-y-auto border border-gray-200">
           {/* Lobby / Start Game Control */}
           {lobby.state === 'LOBBY' && (
              <div className="text-center mb-6 py-6 bg-amber-100 rounded-lg border border-amber-300">
                 <h2 className="text-2xl font-bold text-amber-800 mb-2">Waiting for Players...</h2>
                 <p className="mb-4 text-amber-900">
                    {lobby.players.length} / 4 Players Joined
                 </p>
                 {me?.isHost ? (
                    <>
                      <button
                         onClick={() => socket.emit('game:start', {})}
                         className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full text-lg shadow-lg transform hover:scale-105 transition-all"
                         disabled={lobby.players.length < 2}
                      >
                         Start Game
                      </button>
                    </>
                 ) : (
                    <p className="text-gray-500 italic">Waiting for host to start...</p>
                 )}
                 {lobby.players.length < 2 && me?.isHost && (
                    <p className="text-red-500 text-sm mt-2">Need at least 2 players.</p>
                 )}
              </div>
           )}

           <h3 className="text-gray-400 font-bold text-xs uppercase mb-2">Game Log</h3>
           {/* Add logs from messages here if you want, or assume generic logs */}
           <div className="space-y-1 text-sm">
             {lobby.messages?.slice(-5).map(msg => (
               <div key={msg.id} className="text-gray-700">
                 <span className="font-bold">{msg.playerName}:</span> {msg.message}
               </div>
             ))}
           </div>
        </div>

        {/* My Player Area */}
        <div className="bg-white p-4 rounded-xl shadow-lg border-t-4 border-amber-500">
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                 <h2 className="text-xl font-bold">{me?.name} (You)</h2>
                 <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">
                    {me?.tokens} Tokens
                 </span>
                 {isMyTurn && <span className="animate-pulse text-amber-600 font-bold">YOUR TURN</span>}
              </div>
           </div>

           {/* My Hand */}
           <div className="flex gap-4 overflow-x-auto pb-2 justify-center">
              {myHand.map((card, idx) => (
                 <div 
                    key={`${card}-${idx}`}
                    onClick={() => isMyTurn && setSelectedCard(card)}
                    className={`
                       cursor-pointer relative w-32 h-48 rounded-lg border-2 p-3 flex flex-col justify-between shadow-sm hover:-translate-y-2 transition-transform
                       ${getCardStyle(card)}
                       ${selectedCard === card ? 'ring-4 ring-amber-400 shadow-xl z-10' : ''}
                    `}
                 >
                    <div className="flex justify-between items-start">
                       <span className="text-2xl font-black opacity-50">{card}</span>
                       <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                          {card}
                       </div>
                    </div>
                    <div className="text-center font-bold text-lg leading-tight">
                       {CARD_NAMES[card]}
                    </div>
                    <div className="text-xs text-center leading-tight opacity-90 min-h-[3rem] flex items-center justify-center">
                       {CARD_DESCRIPTIONS[card]}
                    </div>
                 </div>
              ))}
           </div>

           {/* Controls */}
           {isMyTurn && selectedCard && (
             <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                   <span className="font-bold text-gray-700">Playing: {CARD_NAMES[selectedCard]}</span>
                   
                   {/* Target Selection Feedback */}
                   {[1, 2, 3, 5, 6].includes(selectedCard) && (
                      <span className={`text-sm ${targetId ? 'text-green-600 font-bold' : 'text-red-500'}`}>
                         Target: {targetId ? lobby.players.find(p=>p.id===targetId)?.name : 'Select a player above'}
                      </span>
                   )}

                   {/* Guess Selection for Guard */}
                   {selectedCard === 1 && (
                      <select 
                         className="p-2 border rounded shadow-sm"
                         value={guessCard || ''} 
                         onChange={(e) => setGuessCard(Number(e.target.value) as CardType)}
                      >
                         <option value="">Guess a Card...</option>
                         <option value="2">Priest (2)</option>
                         <option value="3">Baron (3)</option>
                         <option value="4">Handmaid (4)</option>
                         <option value="5">Prince (5)</option>
                         <option value="6">King (6)</option>
                         <option value="7">Countess (7)</option>
                         <option value="8">Princess (8)</option>
                      </select>
                   )}
                </div>

                <div className="flex gap-2">
                   <button 
                      onClick={() => { setSelectedCard(null); setTargetId(null); setGuessCard(null); }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded"
                   >
                      Cancel
                   </button>
                   <button 
                      onClick={handlePlayCard}
                      disabled={[1, 2, 3, 5, 6].includes(selectedCard) && !targetId || (selectedCard === 1 && !guessCard)}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      Play Card
                   </button>
                </div>
             </div>
           )}
        </div>

      </div>

      {/* Winner Overlay */}
      {(lobby.gameData.roundWinner || lobby.gameData.winner) && (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center shadow-2xl animate-bounce-in">
               <h2 className="text-3xl font-bold mb-4 text-amber-600">
                  {lobby.gameData.winner ? 'Game Over!' : 'Round Over!'}
               </h2>
               <p className="text-xl mb-6">
                  {lobby.gameData.winner 
                     ? `${lobby.players.find(p => p.id === lobby.gameData?.winner)?.name} Wins the Game!` 
                     : `${lobby.players.find(p => p.id === lobby.gameData?.roundWinner)?.name} Wins the Round!`}
               </p>
               {me?.isHost && (
                  <button 
                     onClick={() => socket.emit('game:start', {})} // Reuse start for next round/new game
                     className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full text-lg shadow-lg transform hover:scale-105 transition-all"
                  >
                     {lobby.gameData.winner ? 'New Game' : 'Next Round'}
                  </button>
               )}
            </div>
         </div>
      )}

    </div>
  );
};

export default LoveLetterGame;
