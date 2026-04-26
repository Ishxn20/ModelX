import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentMessage, MLBlueprint, Phase } from '../lib/types';
import { normalizeAgentName } from '../lib/agentUtils';

interface UseSSEReturn {
  phase: Phase;
  messages: AgentMessage[];
  blueprint: MLBlueprint | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  reconnect: () => void;
}

interface SSEMessage {
  type: 'connected' | 'phase_change' | 'agent_message' | 'blueprint' | 'decision' | 'error' | 'ping';
  data: Record<string, unknown>;
}

export const useSSE = (sessionId: string | null, enabled: boolean = true): UseSSEReturn => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [blueprint, setBlueprint] = useState<MLBlueprint | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isCompletedRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000;

  const connect = useCallback(() => {
    if (!sessionId || !enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const sseUrl = `${API_URL}/api/sse/${sessionId}`;

    setConnectionStatus('connecting');
    setError(null);

    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const sseMessage: SSEMessage = JSON.parse(event.data);

          switch (sseMessage.type) {
            case 'connected':
            case 'ping':
              break;

            case 'phase_change': {
              const newPhase = sseMessage.data.phase as Phase;
              setPhase(newPhase);
              if (newPhase === 'completed') {
                isCompletedRef.current = true;
              }
              break;
            }

            case 'agent_message': {
              const agentMessage: AgentMessage = {
                agent: normalizeAgentName(String(sseMessage.data.agent || 'system')),
                message: String(sseMessage.data.message || ''),
                message_type: String(sseMessage.data.message_type || 'info'),
                timestamp:
                  typeof sseMessage.data.timestamp === 'number'
                    ? sseMessage.data.timestamp
                    : Date.now(),
              };

              setMessages((prev) => {
                const exists = prev.some(
                  (message) =>
                    message.agent === agentMessage.agent &&
                    message.message === agentMessage.message &&
                    message.timestamp === agentMessage.timestamp
                );
                if (exists) return prev;
                return [...prev, agentMessage].sort((a, b) => a.timestamp - b.timestamp);
              });
              break;
            }

            case 'blueprint':
            case 'decision':
              setBlueprint(sseMessage.data as unknown as MLBlueprint);
              setPhase('completed');
              isCompletedRef.current = true;
              break;

            case 'error':
              setError(String(sseMessage.data.message || 'An error occurred'));
              setConnectionStatus('error');
              break;

            default:
              console.warn('Unknown SSE message type:', sseMessage.type);
          }
        } catch (parseError) {
          console.error('Error parsing SSE message:', parseError, event.data);
        }
      };

      eventSource.onerror = () => {
        const source = eventSourceRef.current;
        if (isCompletedRef.current && source?.readyState === EventSource.CLOSED) {
          setConnectionStatus('disconnected');
          source.close();
          eventSourceRef.current = null;
          return;
        }

        if (!isCompletedRef.current) {
          setConnectionStatus('error');
          setError('Connection error. Attempting to reconnect...');
        }

        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        if (!isCompletedRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (!isCompletedRef.current) {
          setError('Connection failed after multiple attempts. Please refresh the page.');
          setConnectionStatus('disconnected');
        }
      };
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [enabled, sessionId]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
    isCompletedRef.current = false;
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    isCompletedRef.current = false;
    connect();
  }, [connect]);

  useEffect(() => {
    if (enabled && sessionId) {
      connect();
    }
    return () => disconnect();
  }, [connect, disconnect, enabled, sessionId]);

  return {
    phase,
    messages,
    blueprint,
    connectionStatus,
    error,
    reconnect,
  };
};
