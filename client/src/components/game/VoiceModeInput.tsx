/**
 * GAME-SPECIFIC: ThinkAlike - Replace this component for your game
 *
 * This component handles voice mode voting for ThinkAlike where players
 * say words aloud and vote on whether they matched.
 * For a different game, replace with your game's voice interaction
 * (e.g., voice commands, speech recognition, audio cues).
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { Lobby } from '../../types';
import type { Socket } from 'socket.io-client';

interface VoiceModeInputProps {
  lobby: Lobby;
  socket: Socket;
}

type VoteState = 'match' | 'no-match' | null;

const VoiceModeInput: React.FC<VoiceModeInputProps> = ({ lobby, socket }) => {
  const [phase, setPhase] = useState<'voting' | 'submitted' | 'dispute'>('voting');
  const [myVote, setMyVote] = useState<VoteState>(null);
  const [opponentVote, setOpponentVote] = useState<VoteState>(null);

  const myPlayer = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const opponentPlayer = lobby.players.find(p => p.socketId !== lobby.mySocketId);

  // Handle opponent vote - use callback to avoid stale closure issues
  const handleOpponentVote = useCallback((data: { playerId: string; playerName: string; vote: VoteState }) => {
    setOpponentVote(data.vote);

    // Check if we both voted - use functional update to get latest myVote
    setMyVote(currentMyVote => {
      if (currentMyVote && data.vote) {
        if (currentMyVote !== data.vote) {
          // Disagreement - enter dispute phase
          setPhase('dispute');
        }
        // Agreement - server will handle the result
      }
      return currentMyVote; // Don't change myVote
    });
  }, []);

  // Listen for opponent votes
  useEffect(() => {
    if (!socket) return;

    socket.on('game:opponent-vote', handleOpponentVote);

    return () => {
      socket.off('game:opponent-vote', handleOpponentVote);
    };
  }, [socket, handleOpponentVote]);

  const handleVote = (vote: VoteState) => {
    setMyVote(vote);
    setPhase('submitted');

    // Emit vote to server
    socket.emit('game:voice-vote', { vote });
  };

  const handleDisputeRevote = (vote: VoteState) => {
    setMyVote(vote);
    setOpponentVote(null); // Reset opponent vote for revote
    setPhase('submitted');

    // Emit revote to server
    socket.emit('game:voice-dispute-revote', { vote });
  };

  // Phase: Voting (show match/no-match buttons immediately)
  if (phase === 'voting') {
    return (
      <div className="voice-mode-input-container">
        <div className="voice-voting-prompt">
          <h2>Did you match?</h2>
          <p>Click below to vote</p>
        </div>

        <div className="voice-voting-buttons">
          <button
            onClick={() => handleVote('match')}
            className="vote-button vote-button-match"
          >
            <span className="vote-icon">✅</span>
            <span className="vote-text">We Matched!</span>
          </button>

          <button
            onClick={() => handleVote('no-match')}
            className="vote-button vote-button-no-match"
          >
            <span className="vote-icon">❌</span>
            <span className="vote-text">No Match</span>
          </button>
        </div>
      </div>
    );
  }

  // Phase: Submitted (waiting for opponent)
  if (phase === 'submitted' && opponentVote === null) {
    return (
      <div className="voice-mode-input-container">
        <div className="voice-vote-submitted">
          <h3>Your Vote Submitted</h3>
          <div className="submitted-vote">
            {myVote === 'match' ? (
              <>
                <span className="vote-icon">✅</span>
                <span>You voted: We Matched!</span>
              </>
            ) : (
              <>
                <span className="vote-icon">❌</span>
                <span>You voted: No Match</span>
              </>
            )}
          </div>
        </div>

        <div className="waiting-for-opponent">
          <div className="spinner"></div>
          <p>Waiting for {opponentPlayer?.name} to vote...</p>
        </div>
      </div>
    );
  }

  // Phase: Dispute (votes don't match)
  if (phase === 'dispute') {
    return (
      <div className="voice-mode-input-container">
        <div className="dispute-dialog">
          <div className="dispute-header">
            <h3>⚠️ Votes Don't Match!</h3>
          </div>

          <div className="dispute-votes">
            <div className="vote-comparison">
              <div className="player-vote">
                <div className="player-name">{myPlayer?.name}</div>
                <div className={`vote-display ${myVote === 'match' ? 'match' : 'no-match'}`}>
                  {myVote === 'match' ? '✅ Match' : '❌ No Match'}
                </div>
              </div>
              <div className="vs">VS</div>
              <div className="player-vote">
                <div className="player-name">{opponentPlayer?.name}</div>
                <div className={`vote-display ${opponentVote === 'match' ? 'match' : 'no-match'}`}>
                  {opponentVote === 'match' ? '✅ Match' : '❌ No Match'}
                </div>
              </div>
            </div>
          </div>

          <div className="dispute-instructions">
            <p>Discuss what you both said and vote again.</p>
            <p className="text-sm">Both players must agree to continue.</p>
          </div>

          <div className="dispute-voting-buttons">
            <button
              onClick={() => handleDisputeRevote('match')}
              className="vote-button vote-button-match"
            >
              <span className="vote-icon">✅</span>
              <span>We Matched!</span>
            </button>

            <button
              onClick={() => handleDisputeRevote('no-match')}
              className="vote-button vote-button-no-match"
            >
              <span className="vote-icon">❌</span>
              <span>No Match</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default VoiceModeInput;
