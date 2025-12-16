import React, { useState, useEffect } from 'react';
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

  // Set theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'loveletter');
    return () => {
      // Optional: reset to default or leave it
      // document.documentElement.removeAttribute('data-theme');
    };
  }, []);

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
    <div className="flex flex-col h-full p-2 overflow-hidden bg-transparent">
      
      {/* Header Info */}
      <div className="flex justify-between items-center mb-2 card p-3 rounded-lg shadow-sm">
        <div>
           <h1 className="text-xl font-bold">Love Letter</h1>
           <span className="text-sm opacity-75">Room: {lobby.code} | Round: {lobby.gameData.currentRound}</span>
        </div>
        <div className="text-right">
           <div className="text-lg font-semibold">
              Deck: {lobby.gameData.deckCount} cards
           </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        
        {/* Opponents Row */}
        <div className="flex justify-center gap-4 flex-wrap">
          {lobby.players.filter(p => p.id !== me?.id).map(player => (
            <div 
              key={player.id} 
              className={`
                relative p-2 rounded-xl border-2 flex-grow min-w-[120px] max-w-[calc(50%-1rem)] sm:max-w-48 transition-all card
                ${lobby.gameData?.currentTurn === player.id ? 'border-[var(--accent-color)] shadow-lg scale-105' : 'border-[var(--border-color)]'}
                ${player.isEliminated ? 'opacity-50 grayscale' : ''}
                ${targetId === player.id ? 'ring-4 ring-[var(--accent-color)]' : ''}
                ${player.isImmune ? 'border-blue-400 bg-blue-900/20' : ''}
              `}
              onClick={() => !player.isEliminated && player.isImmune === false && player.id ? setTargetId(player.id) : null}
            >
              <div className="flex items-center gap-2 mb-2">
                 {player.avatarUrl ? (
                    <div className="avatar-container">
                        <img src={player.avatarUrl} className="w-8 h-8 rounded-full" />
                    </div>
                 ) : <User className="w-6 h-6" />}
                 <span className="font-bold truncate">{player.name}</span>
                 {player.isHost && <Crown className="w-4 h-4 text-[var(--accent-color)]" />}
              </div>
              
              <div className="space-y-1 text-sm">
                 <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-600 inline-block border border-white/20"></span>
                    <span>Tokens: {player.tokens}</span>
                 </div>
                 <div>Hand: {player.handCount} card(s)</div>
                 {player.isImmune && <div className="flex items-center text-blue-400 gap-1"><Shield className="w-3 h-3"/> Immune</div>}
                 {player.isEliminated && <div className="flex items-center text-red-500 gap-1"><Skull className="w-3 h-3"/> Eliminated</div>}
              </div>

              {/* Discard Pile (Last played) */}
              <div className="mt-2 flex items-center gap-2 justify-center">
                <span className="text-xs opacity-75">Last:</span>
                {player.discarded.length > 0 ? (
                    <div className="relative group">
                        <img 
                            src={CARD_IMAGES[player.discarded[player.discarded.length-1]]} 
                            alt={CARD_NAMES[player.discarded[player.discarded.length-1]]}
                            className="w-8 h-12 object-cover rounded border border-gray-600 shadow-sm"
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-xs p-1 rounded whitespace-nowrap z-20">
                            {CARD_NAMES[player.discarded[player.discarded.length-1]]}
                        </div>
                    </div>
                ) : (
                    <span className="text-xs opacity-50">None</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Area / Log */}
        <div className="flex-1 card rounded-lg shadow-inner p-4 overflow-y-auto min-h-0">
           {/* Lobby / Start Game Control */}
           {lobby.state === 'LOBBY' && (
              <div className="text-center mb-6 py-6 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                 <h2 className="text-2xl font-bold mb-2 text-[var(--royal-gold)]">Waiting for Players...</h2>
                 <p className="mb-4">
                    {lobby.players.length} / 4 Players Joined
                 </p>
                 {me?.isHost ? (
                    <>
                      <button
                         onClick={() => socket.emit('game:start', {})}
                         className="btn btn-primary px-8 py-3 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all"
                         disabled={lobby.players.length < 2}
                      >
                         Start Game
                      </button>
                    </>
                 ) : (
                    <p className="opacity-75 italic">Waiting for host to start...</p>
                 )}
                 {lobby.players.length < 2 && me?.isHost && (
                    <p className="text-red-500 text-sm mt-2">Need at least 2 players.</p>
                 )}
              </div>
           )}

           <h3 className="font-bold text-xs uppercase mb-2 opacity-50 text-[var(--text-secondary)]">Game Log</h3>
           {/* Add logs from messages here if you want, or assume generic logs */}
           <div className="space-y-1 text-sm">
             {lobby.messages?.slice(-5).map(msg => (
               <div key={msg.id} className="opacity-90 text-[var(--text-primary)]">
                 <span className="font-bold">{msg.playerName}:</span> {msg.message}
               </div>
             ))}
           </div>
        </div>

        {/* My Player Area */}
        <div className="card p-3 rounded-xl shadow-lg border-t-4 border-[var(--accent-color)]">
           <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                 <h2 className="text-xl font-bold">{me?.name} (You)</h2>
                 <span className="bg-red-900/50 text-white px-2 py-1 rounded-full text-xs font-bold border border-red-800">
                    {me?.tokens} Tokens
                 </span>
                 {isMyTurn && <span className="animate-pulse text-[var(--accent-color)] font-bold">YOUR TURN</span>}
              </div>
           </div>

           {/* My Hand */}
           <div className="flex gap-4 overflow-x-auto pb-2 justify-center">
              {myHand.map((card, idx) => (
                 <div 
                    key={`${card}-${idx}`}
                    onClick={() => isMyTurn && setSelectedCard(card)}
                    className={`
                       cursor-pointer relative w-[calc(50%-0.5rem)] sm:w-[calc(33.33%-0.66rem)] md:w-28 aspect-[2/3] rounded-lg border-2 shadow-sm hover:-translate-y-2 transition-transform overflow-hidden
                       ${selectedCard === card ? 'ring-4 ring-[var(--accent-color)] shadow-xl z-10 border-[var(--accent-color)]' : 'border-[var(--border-color)]'}
                       bg-[var(--bg-secondary)]
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
             <div className="mt-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                   <span className="font-bold">Playing: {CARD_NAMES[selectedCard]}</span>
                   
                   {/* Target Selection Feedback */}
                   {[1, 2, 3, 5, 6].includes(selectedCard) && (
                      <span className={`text-sm ${targetId ? 'text-green-400 font-bold' : 'text-red-400'}`}>
                         Target: {targetId ? lobby.players.find(p=>p.id===targetId)?.name : 'Select a player above'}
                      </span>
                   )}

                   {/* Guess Selection for Guard */}
                   {selectedCard === 1 && (
                      <select 
                         className="p-2 border rounded shadow-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]"
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
                      className="px-4 py-2 hover:bg-[var(--bg-quaternary)] text-[var(--text-primary)] rounded transition-colors"
                   >
                      Cancel
                   </button>
                   <button 
                      onClick={handlePlayCard}
                      disabled={[1, 2, 3, 5, 6].includes(selectedCard) && !targetId || (selectedCard === 1 && !guessCard)}
                      className="btn btn-primary px-6 py-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="card p-8 rounded-2xl max-w-md w-full text-center shadow-2xl animate-bounce-in border-4 border-[var(--accent-color)]">
               <h2 className="text-3xl font-bold mb-4 text-[var(--accent-color)]" style={{ fontFamily: 'var(--font-heading)' }}>
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
                     className="btn btn-primary px-8 py-3 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all"
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
