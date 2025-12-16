import React, { useState } from 'react';
import type { Lobby, CardType } from '../../types';
import type { Socket } from 'socket.io-client';
import { User, Shield, Crown, Skull } from 'lucide-react';

// Card Image Imports
import backImg from '../../assets/cards/back.png';
import guardImg from '../../assets/cards/guard.png';
import priestImg from '../../assets/cards/priest.png';
import baronImg from '../../assets/cards/baron.png';
import handmaidImg from '../../assets/cards/handmaid.png';
import princeImg from '../../assets/cards/prince.png';
import kingImg from '../../assets/cards/king.png';
import countessImg from '../../assets/cards/countess.png';
import princessImg from '../../assets/cards/princess.png';

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

const CARD_IMAGES: Record<number, string> = {
  0: backImg,
  1: guardImg,
  2: priestImg,
  3: baronImg,
  4: handmaidImg,
  5: princeImg,
  6: kingImg,
  7: countessImg,
  8: princessImg
};

// DEBUG: Check if images are resolving correctly
console.log("LoveLetterGame: Loaded Card Images", CARD_IMAGES);

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
              <div className="mt-2 flex items-center gap-2 justify-center">
                <span className="text-xs text-gray-500">Last:</span>
                {player.discarded.length > 0 ? (
                    <div className="relative group">
                        <img 
                            src={CARD_IMAGES[player.discarded[player.discarded.length-1]]} 
                            alt={CARD_NAMES[player.discarded[player.discarded.length-1]]}
                            className="w-8 h-12 object-cover rounded border border-gray-300 shadow-sm"
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-xs p-1 rounded whitespace-nowrap z-20">
                            {CARD_NAMES[player.discarded[player.discarded.length-1]]}
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">None</span>
                )}
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
                       cursor-pointer relative w-32 h-48 rounded-lg border-2 shadow-sm hover:-translate-y-2 transition-transform overflow-hidden
                       ${selectedCard === card ? 'ring-4 ring-amber-400 shadow-xl z-10 border-amber-500' : 'border-gray-400'}
                       bg-white
                    `}
                 >
                    <img 
                        src={CARD_IMAGES[card]} 
                        alt={CARD_NAMES[card]} 
                        className="absolute inset-0 w-full h-full object-cover"
                    />
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
