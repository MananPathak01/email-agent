import { useState, useEffect, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Disable WebSocket for Vercel deployment (serverless doesn't support WebSockets)
    console.log('WebSocket disabled for serverless deployment');
    // Set as "connected" to avoid UI issues
    setIsConnected(true);
  }, []);

  const sendMessage = (message: WebSocketMessage) => {
    console.log('WebSocket message (disabled):', message);
    // No-op for serverless deployment
  };

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}
