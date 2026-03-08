import { useState, useEffect, useCallback, useRef } from "react";

interface WSMessage {
  type: string;
  channel?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

interface UseWebSocketOptions {
  userId: string;
  orgId: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  connected: boolean;
  lastMessage: WSMessage | null;
  sendMessage: (message: WSMessage) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  reconnect: () => void;
  connectionState: "connecting" | "connected" | "disconnected" | "error";
}

export function useWebSocket(
  options: UseWebSocketOptions,
): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    userId,
    orgId,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}&orgId=${orgId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnectionState("connected");
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        setLastMessage(message);
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setConnectionState("disconnected");
      wsRef.current = null;

      if (
        autoReconnect &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        reconnectAttemptsRef.current++;
        reconnectTimerRef.current = setTimeout(
          connect,
          reconnectInterval * Math.min(reconnectAttemptsRef.current, 5),
        );
      }
    };

    ws.onerror = () => {
      setConnectionState("error");
    };
  }, [
    userId,
    orgId,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback(
    (channel: string) => {
      sendMessage({
        type: "subscribe",
        channel,
        payload: {},
        timestamp: Date.now(),
      });
    },
    [sendMessage],
  );

  const unsubscribe = useCallback(
    (channel: string) => {
      sendMessage({
        type: "unsubscribe",
        channel,
        payload: {},
        timestamp: Date.now(),
      });
    },
    [sendMessage],
  );

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  return {
    connected,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    reconnect,
    connectionState,
  };
}
