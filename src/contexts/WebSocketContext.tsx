// src/contexts/WebSocketContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt?: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (receiverId: string, message: string) => void;
  messages: Message[];
  typingUsers: Set<string>;
  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;
  markAsRead: (senderId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  messages: [],
  typingUsers: new Set(),
  startTyping: () => {},
  stopTyping: () => {},
  markAsRead: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const { user } = useAuth();

  // Track pending messages to prevent duplicates
  const pendingMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const connectWebSocket = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        return;
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      // Use environment variable for WebSocket URL
      const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://kasali-oloshe.onrender.com';
      const wsUrl = `${wsBaseUrl.replace(/\/$/, '')}/ws/chat/?token=${encodeURIComponent(token)}`;

      console.log('Connecting to WebSocket:', wsUrl.replace(token, 'TOKEN_HIDDEN'));

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          pendingMessageIds.current.clear();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message:', data.type, data.message?.id);

            switch (data.type) {
              case 'connection_established':
                console.log('Connection established for user:', data.userId);
                break;

              case 'new_message':
                if (data.message && data.message.receiverId === user?.id.toString()) {
                  if (!pendingMessageIds.current.has(data.message.id)) {
                    setMessages((prev) => {
                      if (prev.some(m => m.id === data.message.id)) {
                        return prev;
                      }
                      return [...prev, data.message];
                    });
                  }
                }
                break;

              case 'message_sent':
                if (data.message && data.message.id) {
                  pendingMessageIds.current.add(data.message.id);
                }
                break;

              case 'typing_indicator':
                if (data.isTyping) {
                  setTypingUsers((prev) => new Set(prev).add(data.senderId));
                } else {
                  setTypingUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(data.senderId);
                    return next;
                  });
                }
                break;

              default:
                console.log('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        // FIXED: Single error handler with proper cleanup
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          setIsConnected(false);
          wsRef.current = null;

          // Use a ref to track if component is still mounted
          const isMounted = { current: true };

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted.current) {
                reconnectAttemptsRef.current += 1;
                connectWebSocket();
              }
            }, delay);
          } else {
            console.error('Max reconnection attempts reached. Please refresh the page.');
          }

          // Cleanup function for the timeout
          return () => {
            isMounted.current = false;
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
          };
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      pendingMessageIds.current.clear();
      reconnectAttemptsRef.current = 0;
    };
  }, [user]);

  const sendMessage = (receiverId: string, message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'chat_message',
        receiverId,
        message,
      })
    );
  };

  const startTyping = (receiverId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'typing_start',
        receiverId,
      })
    );
  };

  const stopTyping = (receiverId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'typing_stop',
        receiverId,
      })
    );
  };

  const markAsRead = (senderId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'mark_read',
        senderId,
      })
    );
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        messages,
        typingUsers,
        startTyping,
        stopTyping,
        markAsRead,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}