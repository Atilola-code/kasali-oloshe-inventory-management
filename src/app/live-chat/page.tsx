"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Send, Search, MessagesSquare, Wifi, WifiOff, ChevronLeft, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { toast } from 'react-toastify';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
}

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

export default function LiveChatPage() {
  const { user } = useAuth();
  const { isConnected, sendMessage, messages: wsMessages, typingUsers, startTyping, stopTyping } = useWebSocket();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
    fetchUnreadCounts();
  }, []);

  // Update messages when WebSocket messages change
  useEffect(() => {
    if (wsMessages.length > 0) {
      setMessages(prev => {
        const newMessages = [...prev];
        wsMessages.forEach(wsMsg => {
          if (!newMessages.some(m => m.id === wsMsg.id)) {
            newMessages.push(wsMsg);
          }
        });
        return newMessages.sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      });
    }
  }, [wsMessages]);

  // Fetch conversation when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchConversation(selectedUser.id);
      markAsRead(selectedUser.id);
    }
  }, [selectedUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && newMessage.trim()) {
        e.preventDefault();
        handleSendMessage();
      }
      // Escape to clear input
      if (e.key === 'Escape') {
        setNewMessage('');
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newMessage, selectedUser, user]);

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const response = await apiFetch('/api/chat/users/');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchConversation = async (userId: string) => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/chat/conversation/${userId}/`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await apiFetch('/api/chat/unread-by-user/');
      if (response.ok) {
        const data = await response.json();
        setUnreadCounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  };

  const markAsRead = async (userId: string) => {
    try {
      await apiFetch(`/api/chat/messages/read/${userId}/`, {
        method: 'PUT',
      });
      setUnreadCounts((prev) => ({ ...prev, [userId]: 0 }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !user || sending) return;

    const messageText = newMessage;
    const tempMessage: Message = {
      senderId: user.id.toString(),
      receiverId: selectedUser.id,
      message: messageText,
      createdAt: new Date().toISOString(),
      sender: {
        first_name: user.first_name,
        last_name: user.last_name,
      }
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSending(true);

    try {
      // ALWAYS save to database via HTTP API
      const response = await apiFetch('/api/chat/message/', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: selectedUser.id,
          message: messageText,
        }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setMessages(prev => 
          prev.map(m => m === tempMessage ? savedMessage : m)
        );

        // Also send via WebSocket if connected (for real-time)
        if (isConnected) {
          sendMessage(selectedUser.id, messageText);
        } else {
          console.log('WebSocket disconnected, message saved to database only');
        }
      } else {
        throw new Error('Failed to save message');
      }

      if (selectedUser) {
        stopTyping(selectedUser.id);
      }
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temp message if failed
      setMessages(prev => prev.filter(m => m !== tempMessage));
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!selectedUser || !isConnected) return;

    startTyping(selectedUser.id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUser) {
        stopTyping(selectedUser.id);
      }
    }, 2000);
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchUsers(),
      fetchUnreadCounts(),
    ]);
    toast.success('Chat refreshed');
  };

  const filteredUsers = users.filter((u) =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isTyping = selectedUser ? typingUsers.has(selectedUser.id) : false;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />

          <main className="pt-20">
            {/* Back Button */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium text-sm">Back to Dashboard</span>
              </button>
            </div>

            <div className="flex h-[calc(100vh-10rem)] bg-gray-50">
              {/* Users Sidebar */}
              <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold">Messages</h2>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
                          <Wifi className="w-3 h-3" />
                          <span>Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">
                          <WifiOff className="w-3 h-3" />
                          <span>Offline</span>
                        </div>
                      )}
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        title="Refresh chat"
                      >
                        <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessagesSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No users found</p>
                      {searchQuery && (
                        <p className="text-xs text-gray-400 mt-1">
                          Try a different search term
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition border-b ${
                          selectedUser?.id === u.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                        }`}
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold">
                            {u.first_name[0]}
                            {u.last_name[0]}
                          </div>
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="text-xs text-gray-500 uppercase">{u.role}</div>
                        </div>
                        {unreadCounts[u.id] > 0 && (
                          <div className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {unreadCounts[u.id]}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col">
                {selectedUser ? (
                  <>
                    {/* Chat Header */}
                    <div className="bg-white border-b p-4 flex items-center gap-3">
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                        aria-label="Back to user list"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold">
                        {selectedUser.first_name[0]}
                        {selectedUser.last_name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {selectedUser.first_name} {selectedUser.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{selectedUser.role}</div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                      {loading ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg, idx) => {
                            const isSent = msg.senderId === user?.id.toString();
                            const messageDate = new Date(msg.createdAt || '');
                            const showDate = idx === 0 || 
                              new Date(messages[idx - 1].createdAt || '').toDateString() !== messageDate.toDateString();
                            
                            return (
                              <div key={msg.id || `msg-${idx}`}>
                                {showDate && (
                                  <div className="text-center my-4">
                                    <span className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">
                                      {messageDate.toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                )}
                                <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`max-w-xs lg:max-w-md ${
                                      isSent ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                                    } rounded-2xl px-4 py-2 shadow`}
                                  >
                                    {!isSent && (
                                      <p className="text-xs font-semibold text-gray-700 mb-1">
                                        {msg.sender?.first_name} {msg.sender?.last_name}
                                      </p>
                                    )}
                                    <p className="text-sm break-words">{msg.message}</p>
                                    <p className={`text-xs mt-1 ${isSent ? 'text-blue-100' : 'text-gray-500'}`}>
                                      {messageDate.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {isTyping && (
                            <div className="flex justify-start">
                              <div className="bg-gray-200 rounded-lg px-4 py-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="bg-white border-t p-4">
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          disabled={loading}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || loading || sending}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 min-w-[80px]"
                        >
                          {sending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          {sending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                      
                      {/* Keyboard Shortcuts Hint */}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">Enter</kbd> to send • 
                          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono mx-1">Ctrl/Cmd</kbd> + 
                          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono ml-1">Enter</kbd> to send • 
                          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono ml-2">Esc</kbd> to clear
                        </p>
                        
                        {!isConnected && (
                          <p className="text-xs text-red-600">
                            ⚠️ WebSocket disconnected. Messages will be sent via HTTP.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
                    <div className="text-center">
                      <MessagesSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Select a user to start chatting</p>
                      <p className="text-sm text-gray-400 mt-2">Click on any user from the sidebar to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}