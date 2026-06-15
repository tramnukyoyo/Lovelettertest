import { useState, useCallback, useMemo } from 'react';

export interface UseGameRoundsOptions {
  totalRounds: number;
  phases?: string[];
  onRoundEnd?: (round: number) => void;
  onGameEnd?: () => void;
}

export interface UseGameRoundsResult {
  currentRound: number;
  totalRounds: number;
  currentPhase: string;
  phaseIndex: number;
  isLastRound: boolean;
  isGameOver: boolean;
  nextRound: () => void;
  nextPhase: () => void;
  setPhase: (phase: string) => void;
  setRound: (round: number) => void;
  resetRounds: () => void;
  roundLabel: string;
}

export function useGameRounds(options: UseGameRoundsOptions): UseGameRoundsResult {
  const { totalRounds, phases = ['playing'], onRoundEnd, onGameEnd } = options;
  const [currentRound, setCurrentRound] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const currentPhase = phases[phaseIndex] || phases[0];
  const isLastRound = currentRound >= totalRounds;

  const nextPhase = useCallback(() => {
    setPhaseIndex(prev => {
      const next = prev + 1;
      if (next >= phases.length) {
        // All phases done for this round - trigger round end
        onRoundEnd?.(currentRound);
        if (currentRound >= totalRounds) {
          setIsGameOver(true);
          onGameEnd?.();
        } else {
          setCurrentRound(r => r + 1);
        }
        return 0; // reset to first phase
      }
      return next;
    });
  }, [phases.length, currentRound, totalRounds, onRoundEnd, onGameEnd]);

  const nextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      setIsGameOver(true);
      onGameEnd?.();
      return;
    }
    onRoundEnd?.(currentRound);
    setCurrentRound(r => r + 1);
    setPhaseIndex(0);
  }, [currentRound, totalRounds, onRoundEnd, onGameEnd]);

  const setPhase = useCallback((phase: string) => {
    const idx = phases.indexOf(phase);
    if (idx >= 0) setPhaseIndex(idx);
  }, [phases]);

  const setRound = useCallback((round: number) => {
    setCurrentRound(round);
    setPhaseIndex(0);
    setIsGameOver(false);
  }, []);

  const resetRounds = useCallback(() => {
    setCurrentRound(1);
    setPhaseIndex(0);
    setIsGameOver(false);
  }, []);

  const roundLabel = useMemo(
    () => `Round ${currentRound}/${totalRounds}`,
    [currentRound, totalRounds]
  );

  return {
    currentRound,
    totalRounds,
    currentPhase,
    phaseIndex,
    isLastRound,
    isGameOver,
    nextRound,
    nextPhase,
    setPhase,
    setRound,
    resetRounds,
    roundLabel,
  };
}
