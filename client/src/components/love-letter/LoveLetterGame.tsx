import React, { useState, useEffect } from 'react';
import type { Lobby, CardType } from '../../types';
import type { Socket } from 'socket.io-client';
import { User, Copy, Users, Settings, Shield, Crown, Skull } from 'lucide-react';

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

const LoveLetterGame: React.FC<LoveLetterGameProps> = ({ lobby, socket }) => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [guessCard, setGuessCard] = useState<CardType | null>(null);
  
  const me = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isMyTurn = lobby.gameData?.currentTurn === me?.id;
  const myHand = me?.hand || [];
  const otherPlayers = lobby.players.filter(p => p.id !== me?.id);

  const handlePlayCard = () => {
    if (!selectedCard) return;

    // Validation before emit
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

  const copyRoomCode = () => {
    navigator.clipboard.writeText(lobby.code);
  };

  if (!lobby.gameData) return <div className="text-white text-center mt-20">Loading Game Data...</div>;

  return (
    <div className="h-screen bg-[#1a0b2e] font-sans text-slate-100 flex flex-col items-center p-4 overflow-hidden">
      


      {/* Main Game Container */}
      <div className="w-full bg-[#fffbf0] rounded-xl overflow-hidden shadow-2xl flex flex-col flex-1">
        
        {/* TOP SECTION: Opponents Area */}
        <div className="relative h-[30%] min-h-0 p-6 flex items-center justify-center gap-8 border-b-8 border-[#e2d5b5] bg-[#fffbf0]">
          <div className="absolute top-2 left-0 w-full text-center">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Opponents</span>
          </div>

          {otherPlayers.map(player => (
             <div 
                key={player.id} 
                className={`
                    relative flex flex-col items-center transition-all cursor-pointer p-2 rounded-xl
                    ${targetId === player.id ? 'bg-amber-100 ring-4 ring-amber-400 scale-105' : ''}
                    ${lobby.gameData?.currentTurn === player.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
                    ${player.isEliminated ? 'opacity-50 grayscale' : ''}
                `}
                onClick={() => !player.isEliminated && player.isImmune === false && player.id ? setTargetId(player.id) : null}
             >
                {/* Player Info */}
                <div className="flex items-center gap-3 bg-white/80 p-2 rounded-xl border border-slate-200 shadow-sm w-48 mb-2">
                    <div className="w-10 h-10 bg-indigo-500 rounded-lg overflow-hidden border-2 border-slate-800 flex items-center justify-center shrink-0">
                        {player.avatarUrl ? (
                            <img src={player.avatarUrl} alt="avatar" className="w-full h-full" />
                        ) : (
                            <User className="text-white w-6 h-6" />
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-800 truncate">{player.name}</span>
                            {player.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> {player.tokens} Tokens</span>
                             {player.isImmune && <Shield className="w-3 h-3 text-blue-500" />}
                             {player.isEliminated && <Skull className="w-3 h-3 text-red-500" />}
                        </div>
                    </div>
                </div>

                {/* Opponent Card (Face Down) or Last Played */}
                <div className="relative">
                    {/* Hand Count representation */}
                    <div className="flex justify-center -space-x-8">
                         {Array.from({length: Math.min(player.handCount, 3)}).map((_, i) => (
                             <div key={i} className="w-20 h-28 rounded shadow-md transition-transform" style={{ transform: `rotate(${(i - (player.handCount-1)/2) * 5}deg)` }}>
                                <img src={backImg} alt="Card Back" className="w-full h-full object-contain drop-shadow-md" />
                             </div>
                         ))}
                    </div>
                    
                    {/* Last Played Overlay */}
                    {player.discarded.length > 0 && (
                        <div className="absolute top-12 -right-12 z-10 w-12 h-16 shadow-lg rotate-12 bg-white p-0.5 rounded">
                            <img 
                                src={CARD_IMAGES[player.discarded[player.discarded.length-1]]} 
                                alt="Discard" 
                                className="w-full h-full object-cover rounded-sm"
                            />
                            <div className="absolute -bottom-4 left-0 right-0 text-[8px] bg-black text-white text-center rounded px-1">
                                Last
                            </div>
                        </div>
                    )}
                </div>
             </div>
          ))}
          
          {otherPlayers.length === 0 && (
             <div className="text-slate-400 italic">Waiting for opponents...</div>
          )}
        </div>

        {/* MIDDLE SECTION: Deck & Game Log */}
        <div className="bg-[#1e293b] p-4 flex-1 flex border-b-4 border-slate-900 relative shadow-inner gap-4 overflow-hidden">
          
          {/* Deck Area */}
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-slate-700/50 rounded-xl bg-[#0f172a]/50 relative">
            <h3 className="absolute top-2 text-xs font-bold text-[#e2e8f0] uppercase tracking-wider drop-shadow-md opacity-70">
              Deck ({lobby.gameData.deckCount})
            </h3>
            
            <div className="flex items-center justify-center mt-4 pl-12"> 
              {Array.from({ length: Math.min(lobby.gameData.deckCount, 5) }).map((_, i) => (
                <div 
                  key={i} 
                  className="transition-transform"
                  style={{ 
                    marginLeft: '-45px', 
                    zIndex: i 
                  }}
                >
                  <img src={backImg} alt="Deck" className="w-24 h-36 object-contain drop-shadow-xl" />
                </div>
              ))}
            </div>

            {/* Waiting State */}
            {lobby.state === 'LOBBY' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-4 z-20 backdrop-blur-sm rounded-xl">
                    <h2 className="text-2xl font-bold text-white">Waiting for Players</h2>
                     {me?.isHost && (
                        <button
                            onClick={() => socket.emit('game:start', {})}
                            disabled={lobby.players.length < 2}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Game
                        </button>
                    )}
                </div>
            )}
          </div>

          {/* Game Log Area */}
          <div className="w-1/3 min-w-[200px] border-l border-slate-700 pl-4 flex flex-col">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Settings size={12} /> Game Log
             </div>
             <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {lobby.messages?.slice().reverse().map(msg => (
                   <div key={msg.id} className="text-xs text-slate-300 border-b border-slate-700/50 pb-1">
                      <span className="font-bold text-indigo-400">{msg.playerName}:</span> {msg.message}
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Player Area */}
        <div className="bg-[#1e293b] h-[35%] min-h-0 p-6 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20"></div>
            
            <div className="flex items-center gap-4 mb-4 z-10 relative">
              <span className="text-xl font-bold text-white">{me?.name} (You)</span>
              <span className="bg-rose-300 text-rose-900 text-xs font-black px-3 py-1 rounded-full uppercase">
                {me?.tokens} Tokens
              </span>
              {isMyTurn && <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">YOUR TURN</span>}
            </div>

            <div className="w-full flex justify-center items-end h-full pb-4 gap-8">
               {/* My Hand */}
               {myHand.map((card, idx) => (
                 <div 
                    key={`${card}-${idx}`}
                    className={`
                       relative group cursor-pointer transition-all duration-300 ease-out h-[85%] aspect-[2/3]
                       ${selectedCard === card ? '-translate-y-8 z-20 scale-110' : 'hover:-translate-y-4 hover:z-10'}
                       ${!isMyTurn ? 'opacity-80' : ''}
                    `}
                    onClick={() => isMyTurn && setSelectedCard(card)}
                 >
                    <img 
                        src={CARD_IMAGES[card]} 
                        alt={CARD_NAMES[card]}
                        className={`
                            h-full w-full object-cover rounded-xl shadow-2xl border-4 
                            ${selectedCard === card ? 'border-amber-400' : 'border-[#2d3748]'}
                        `}
                    />
                    
                    {/* Card Glow */}
                    <div className={`
                        absolute inset-0 bg-amber-400/20 blur-xl rounded-lg -z-10 transition-opacity
                        ${selectedCard === card ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    `}></div>
                 </div>
               ))}
            </div>

            {/* Context Actions Menu (Floating above cards when selected) */}
            {isMyTurn && selectedCard && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white p-4 rounded-xl shadow-2xl border border-slate-600 z-30 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                     <div className="flex flex-col">
                        <span className="text-xs text-slate-400 uppercase font-bold">Playing</span>
                        <span className="font-bold text-amber-400">{CARD_NAMES[selectedCard]}</span>
                     </div>

                     <div className="h-8 w-px bg-slate-600"></div>

                     {/* Dynamic Inputs based on Card */}
                     {[1, 2, 3, 5, 6].includes(selectedCard) && (
                         <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase font-bold">Target</span>
                            <span className={`font-bold ${targetId ? 'text-green-400' : 'text-red-400 animate-pulse'}`}>
                                {targetId ? lobby.players.find(p=>p.id===targetId)?.name : 'Select Player Above'}
                            </span>
                         </div>
                     )}

                     {selectedCard === 1 && (
                         <select 
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                            value={guessCard || ''} 
                            onChange={(e) => setGuessCard(Number(e.target.value) as CardType)}
                         >
                            <option value="">Guess Card...</option>
                            <option value="2">Priest (2)</option>
                            <option value="3">Baron (3)</option>
                            <option value="4">Handmaid (4)</option>
                            <option value="5">Prince (5)</option>
                            <option value="6">King (6)</option>
                            <option value="7">Countess (7)</option>
                            <option value="8">Princess (8)</option>
                         </select>
                     )}

                     <button 
                        onClick={handlePlayCard}
                        disabled={([1, 2, 3, 5, 6].includes(selectedCard) && !targetId) || (selectedCard === 1 && !guessCard)}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:grayscale transition-all"
                     >
                        Confirm
                     </button>
                     <button 
                        onClick={() => { setSelectedCard(null); setTargetId(null); setGuessCard(null); }}
                        className="text-slate-400 hover:text-white px-2"
                     >
                        Cancel
                     </button>
                </div>
            )}
        </div>

      </div>

      {/* Winner Overlay */}
      {(lobby.gameData.roundWinner || lobby.gameData.winner) && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a0b2e] border-2 border-amber-500 p-10 rounded-2xl max-w-lg w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.5)]">
               <h2 className="text-4xl font-black mb-4 text-amber-500 uppercase tracking-widest drop-shadow-md">
                  {lobby.gameData.winner ? 'Victory!' : 'Round Over'}
               </h2>
               
               <div className="my-8">
                  <div className="text-slate-300 mb-2 uppercase text-xs tracking-widest">Winner</div>
                  <div className="text-3xl font-bold text-white">
                      {lobby.gameData.winner 
                        ? lobby.players.find(p => p.id === lobby.gameData?.winner)?.name 
                        : lobby.players.find(p => p.id === lobby.gameData?.roundWinner)?.name}
                  </div>
               </div>

               {me?.isHost && (
                  <button 
                     onClick={() => socket.emit('game:start', {})}
                     className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all uppercase tracking-wider"
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