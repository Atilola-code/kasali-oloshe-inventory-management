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
  sendMessage: (receiverId: string, message: string, messageId: string) => void;
  messages: Message[];
  typingUsers: Set<string>;
  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;
  markAsRead: (senderId: string) => void;
  newMessageNotification: Message | null;
  clearNotification: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  messages: [],
  typingUsers: new Set(),
  startTyping: () => {},
  stopTyping: () => {},
  markAsRead: () => {},
  newMessageNotification: null,
  clearNotification: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [newMessageNotification, setNewMessageNotification] = useState<Message | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const { user } = useAuth();

  // Track processed message IDs to prevent duplicates
  const processedMessageIds = useRef<Set<string>>(new Set());

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

      const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://kasali-oloshe.onrender.com';
      const wsUrl = `${wsBaseUrl.replace(/\/$/, '')}/ws/chat/?token=${encodeURIComponent(token)}`;

      console.log('Connecting to WebSocket...');

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          processedMessageIds.current.clear();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message:', data.type);

            switch (data.type) {
              case 'connection_established':
                console.log('Connection established for user:', data.userId);
                break;

              case 'new_message':
                // Only process if we haven't seen this message ID before
                if (data.message && data.message.id && !processedMessageIds.current.has(data.message.id)) {
                  processedMessageIds.current.add(data.message.id);
                  
                  // Only add if it's for the current user
                  if (data.message.receiverId === user?.id.toString()) {
                    setMessages((prev) => {
                      // Double-check we don't already have this message
                      if (prev.some(m => m.id === data.message.id)) {
                        return prev;
                      }
                      return [...prev, data.message];
                    });

                    // Show notification for new message
                    setNewMessageNotification(data.message);
                    
                    // Play notification sound
                    playNotificationSound();
                  }
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

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connectWebSocket();
            }, delay);
          } else {
            console.error('Max reconnection attempts reached.');
          }
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
      processedMessageIds.current.clear();
      reconnectAttemptsRef.current = 0;
    };
  }, [user]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3'); 
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Could not play notification sound:', err));
    } catch (error) {
      console.log('Notification sound not available');
    }
  };

  const sendMessage = (receiverId: string, message: string, messageId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, message will be sent via HTTP only');
      return;
    }

    // Send via WebSocket for real-time delivery (message already saved via HTTP)
    wsRef.current.send(
      JSON.stringify({
        type: 'chat_message',
        receiverId,
        message,
        messageId, // Include the message ID from HTTP response
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

  const clearNotification = () => {
    setNewMessageNotification(null);
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
        newMessageNotification,
        clearNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}