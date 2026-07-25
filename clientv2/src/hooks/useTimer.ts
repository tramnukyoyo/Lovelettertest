import { useState, useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socketService';

export interface UseTimerOptions {
  duration: number;
  onComplete?: () => void;
  autoStart?: boolean;
  syncWithServer?: boolean;
}

export interface UseTimerResult {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  start: (duration?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: (duration?: number) => void;
  formatTime: (seconds?: number) => string;
  percentage: number;
  isCritical: boolean;
  isWarning: boolean;
}

export function useTimer(options: UseTimerOptions): UseTimerResult {
  const { duration, onComplete, autoStart = false, syncWithServer = true } = options;
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDurationRef = useRef(duration);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((newDuration?: number) => {
    const d = newDuration ?? totalDurationRef.current;
    totalDurationRef.current = d;
    setTimeRemaining(d);
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    setIsRunning(true);
  }, []);

  const reset = useCallback((newDuration?: number) => {
    clearTimer();
    const d = newDuration ?? totalDurationRef.current;
    totalDurationRef.current = d;
    setTimeRemaining(d);
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  // Countdown interval
  useEffect(() => {
    clearTimer();
    if (!isRunning || isPaused) return;

    intervalRef.current = setInterval(() => {
      // FREEZE-ON-DISCONNECT: the server's clock is not running either, and the
      // player is behind the blocking FreezeOverlay with no way to act. Skip the
      // tick entirely so the countdown never reaches 0 (and never fires
      // onComplete) during an outage; it resumes where it stopped.
      if (!socketService.isConnected()) return;
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, isPaused, clearTimer]);

  // Server sync: listen for timer:update events
  useEffect(() => {
    if (!syncWithServer) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    const onTimerUpdate = (data: { timeRemaining: number; isRunning?: boolean }) => {
      setTimeRemaining(data.timeRemaining);
      if (data.isRunning !== undefined) {
        setIsRunning(data.isRunning);
        setIsPaused(!data.isRunning);
      }
    };

    socket.on('timer:update', onTimerUpdate);
    return () => { socket.off('timer:update', onTimerUpdate); };
  }, [syncWithServer]);

  const formatTime = useCallback((seconds?: number) => {
    const s = seconds ?? timeRemaining;
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, '0')}`
      : `${secs}`;
  }, [timeRemaining]);

  const percentage = totalDurationRef.current > 0
    ? Math.round((timeRemaining / totalDurationRef.current) * 100)
    : 0;

  return {
    timeRemaining,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    reset,
    formatTime,
    percentage,
    isCritical: timeRemaining <= 10 && timeRemaining > 0,
    isWarning: timeRemaining <= 30 && timeRemaining > 10,
  };
}
