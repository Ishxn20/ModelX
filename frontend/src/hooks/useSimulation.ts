import { useCallback, useEffect, useState } from 'react';
import type { AgentMessage, MLBlueprint, Phase } from '../lib/types';
import { simulationService } from '../lib/simulation';
import { useSSE as useSSEHook } from './useSSE';

interface UseSimulationReturn {
  phase: Phase;
  messages: AgentMessage[];
  blueprint: MLBlueprint | null;
  isRunning: boolean;
  elapsedTime: number;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string | null;
  startSimulation: () => void;
  resetSimulation: () => void;
  reconnect?: () => void;
}

interface UseSimulationOptions {
  sessionId?: string | null;
  useSSE?: boolean;
}

export const useSimulation = (options: UseSimulationOptions = {}): UseSimulationReturn => {
  const { sessionId = null, useSSE = false } = options;
  const shouldUseSSE = useSSE && !!sessionId;
  const sse = useSSEHook(sessionId, shouldUseSSE);

  const [phase, setPhase] = useState<Phase>('idle');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [blueprint, setBlueprint] = useState<MLBlueprint | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (shouldUseSSE) {
      setPhase(sse.phase);
      setMessages(sse.messages);
      setBlueprint(sse.blueprint);
      setIsRunning(sse.phase !== 'completed' && sse.phase !== 'idle' && sse.phase !== 'failed');
    }
  }, [shouldUseSSE, sse.blueprint, sse.messages, sse.phase]);

  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const startSimulation = useCallback(() => {
    if (shouldUseSSE) {
      setIsRunning(true);
      setStartTime(Date.now());
      return;
    }

    setPhase('idle');
    setMessages([]);
    setBlueprint(null);
    setIsRunning(true);
    setElapsedTime(0);
    setStartTime(Date.now());

    simulationService.start({
      onPhaseChange: setPhase,
      onMessage: (message: AgentMessage) => setMessages((prev) => [...prev, message]),
      onBlueprint: setBlueprint,
      onComplete: () => setIsRunning(false),
    });
  }, [shouldUseSSE]);

  const resetSimulation = useCallback(() => {
    simulationService.reset();
    setPhase('idle');
    setMessages([]);
    setBlueprint(null);
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
  }, []);

  return {
    phase,
    messages,
    blueprint,
    isRunning,
    elapsedTime,
    connectionStatus: shouldUseSSE ? sse.connectionStatus : undefined,
    error: shouldUseSSE ? sse.error : undefined,
    startSimulation,
    resetSimulation,
    reconnect: shouldUseSSE ? sse.reconnect : undefined,
  };
};
