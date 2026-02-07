// src/app/live-chat/page.tsx - COMPLETE VERSION
"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { 
  Send, Search, MessagesSquare, Wifi, WifiOff, ChevronLeft, RefreshCw, 
  Smile, Trash2, X, CheckCheck, Check 
} from 'lucide-react';
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
  isRead?: boolean;
  readAt?: string;
  reaction?: string;
  isDeletedBySender?: boolean;
  isDeletedByReceiver?: boolean;
  sender?: {
    first_name: string;
    last_name: string;
  };
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function LiveChatPage() {
  const { user } = useAuth();
  const { 
    isConnected, 
    sendMessage, 
    messages: wsMessages, 
    typingUsers, 
    startTyping, 
    stopTyping,
    newMessageNotification,
    clearNotification
  } = useWebSocket();
  
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Could not play sound:', err));
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUnreadCounts();
  }, []);

  useEffect(() => {
    if (newMessageNotification && (!selectedUser || selectedUser.id !== newMessageNotification.senderId)) {
      const sender = users.find(u => u.id === newMessageNotification.senderId);
      if (sender) {
        toast.info(`New message from ${sender.first_name} ${sender.last_name}`, {
          onClick: () => {
            const user = users.find(u => u.id === newMessageNotification.senderId);
            if (user) {
              setSelectedUser(user);
              clearNotification();
            }
          },
        });
        playNotificationSound();
      }
      fetchUnreadCounts();
    }
  }, [newMessageNotification, selectedUser, users]);

  useEffect(() => {
    if (wsMessages.length > 0 && selectedUser) {
      setMessages(prev => {
        const newMessages = [...prev];
        wsMessages.forEach(wsMsg => {
          if (
            (wsMsg.senderId === selectedUser.id && wsMsg.receiverId === user?.id.toString()) ||
            (wsMsg.receiverId === selectedUser.id && wsMsg.senderId === user?.id.toString())
          ) {
            if (!newMessages.some(m => m.id === wsMsg.id)) {
              newMessages.push(wsMsg);
            }
          }
        });
        return newMessages.sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      });
    }
  }, [wsMessages, selectedUser, user]);

  useEffect(() => {
    if (selectedUser) {
      fetchConversation(selectedUser.id);
      markAsRead(selectedUser.id);
      clearNotification();
      setShowSearch(false);
      setMessageSearchQuery('');
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedUser || !user) return;
    const unreadMessages = messages.filter(
      msg => msg.receiverId === user.id.toString() && !msg.isRead
    );
    if (unreadMessages.length > 0) {
      const lastUnread = unreadMessages[unreadMessages.length - 1];
      if (lastUnread.id && lastUnread.id !== lastReadMessageId) {
        markMessageRead(lastUnread.id);
        setLastReadMessageId(lastUnread.id);
      }
    }
  }, [messages, selectedUser, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && newMessage.trim()) {
        e.preventDefault();
        handleSendMessage();
      }
      if (e.key === 'Escape') {
        setNewMessage('');
        setShowEmojiPicker(null);
        inputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(!showSearch);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newMessage, showSearch]);

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

  const searchMessages = async (searchQuery: string) => {
    if (!selectedUser || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await apiFetch(
        `/api/chat/conversation/${selectedUser.id}/search/?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Failed to search messages:', error);
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
      await apiFetch(`/api/chat/messages/read/${userId}/`, { method: 'PUT' });
      setUnreadCounts((prev) => ({ ...prev, [userId]: 0 }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markMessageRead = async (messageId: string) => {
    try {
      const response = await apiFetch(`/api/chat/message/${messageId}/read/`, {
        method: 'PUT',
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => prev.map(msg => msg.id === messageId ? data : msg));
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !user || sending) return;
    const messageText = newMessage;
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      senderId: user.id.toString(),
      receiverId: selectedUser.id,
      message: messageText,
      createdAt: new Date().toISOString(),
      sender: { first_name: user.first_name, last_name: user.last_name }
    };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSending(true);
    try {
      const response = await apiFetch('/api/chat/message/', {
        method: 'POST',
        body: JSON.stringify({ receiverId: selectedUser.id, message: messageText }),
      });
      if (response.ok) {
        const savedMessage = await response.json();
        setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));
        if (isConnected) {
          sendMessage(selectedUser.id, messageText, savedMessage.id);
        }
      } else {
        throw new Error('Failed to save message');
      }
      if (selectedUser) stopTyping(selectedUser.id);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedUser) return;
    try {
      const response = await apiFetch(`/api/chat/message/${messageId}/react/`, {
        method: 'POST',
        body: JSON.stringify({ reaction: emoji }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => prev.map(msg => msg.id === messageId ? data : msg));
        setShowEmojiPicker(null);
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      const response = await apiFetch(`/api/chat/message/${messageId}/delete/`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleTyping = () => {
    if (!selectedUser || !isConnected) return;
    startTyping(selectedUser.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUser) stopTyping(selectedUser.id);
    }, 2000);
  };

  const handleRefresh = async () => {
    await Promise.all([fetchUsers(), fetchUnreadCounts()]);
    toast.success('Chat refreshed');
  };

  const handleSearchChange = (value: string) => {
    setMessageSearchQuery(value);
    if (value.trim()) {
      searchMessages(value);
    } else {
      setSearchResults([]);
    }
  };

  const scrollToMessage = (messageId: string) => {
    setShowSearch(false);
    setMessageSearchQuery('');
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 2000);
    }
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
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
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
                          <Wifi className="w-3 h-3" /><span>Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">
                          <WifiOff className="w-3 h-3" /><span>Offline</span>
                        </div>
                      )}
                      <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                        <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessagesSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button key={u.id} onClick={() => setSelectedUser(u)}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition border-b ${
                          selectedUser?.id === u.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold">
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-gray-900 truncate">{u.first_name} {u.last_name}</div>
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
                    <div className="bg-white border-b p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold">
                          {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</div>
                          <div className="text-xs text-gray-500">
                            {isTyping ? <span className="text-blue-600 font-medium">typing...</span> : selectedUser.role}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setShowSearch(!showSearch)} className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Search messages (Ctrl+F)">
                        <Search className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    {showSearch && (
                      <div className="bg-white border-b p-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input type="text" placeholder="Search in conversation..." value={messageSearchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          {messageSearchQuery && (
                            <button onClick={() => { setMessageSearchQuery(''); setSearchResults([]); }}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {searchResults.length > 0 && (
                          <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-2">
                            {searchResults.map((result) => (
                              <button key={result.id} onClick={() => scrollToMessage(result.id!)}
                                className="w-full text-left p-2 hover:bg-white rounded transition">
                                <div className="text-xs text-gray-500">{new Date(result.createdAt!).toLocaleString()}</div>
                                <div className="text-sm text-gray-900 truncate">{result.message}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

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
                            const isNewMessage = msg.receiverId === user?.id.toString() && !msg.isRead;
                            
                            return (
                              <div key={msg.id || `msg-${idx}`} id={`message-${msg.id}`}>
                                {showDate && (
                                  <div className="text-center my-4">
                                    <span className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">
                                      {messageDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                )}
                                {isNewMessage && idx > 0 && (
                                  <div className="flex items-center my-2">
                                    <div className="flex-1 border-t border-blue-300"></div>
                                    <span className="px-3 text-xs text-blue-600 font-medium">New Messages</span>
                                    <div className="flex-1 border-t border-blue-300"></div>
                                  </div>
                                )}
                                <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                                  onMouseEnter={() => setHoveredMessageId(msg.id || null)}
                                  onMouseLeave={() => setHoveredMessageId(null)}>
                                  <div className="relative">
                                    <div className={`max-w-xs lg:max-w-md ${
                                      isSent ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                                    } rounded-2xl px-4 py-2 shadow`}>
                                      {!isSent && (
                                        <p className="text-xs font-semibold text-gray-700 mb-1">
                                          {msg.sender?.first_name} {msg.sender?.last_name}
                                        </p>
                                      )}
                                      <p className="text-sm break-words">{msg.message}</p>
                                      <div className="flex items-center justify-between mt-1">
                                        <p className={`text-xs ${isSent ? 'text-blue-100' : 'text-gray-500'}`}>
                                          {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {isSent && (
                                          <div className="ml-2">
                                            {msg.isRead ? <CheckCheck className="w-3 h-3 text-blue-200" /> : <Check className="w-3 h-3 text-blue-200" />}
                                          </div>
                                        )}
                                      </div>
                                      {msg.reaction && (
                                        <div className="absolute -bottom-2 right-2 bg-white rounded-full px-2 py-1 text-sm shadow border">
                                          {msg.reaction}
                                        </div>
                                      )}
                                    </div>
                                    {hoveredMessageId === msg.id && (
                                      <div className="absolute top-0 right-full mr-2 flex gap-1">
                                        <button onClick={() => setShowEmojiPicker(msg.id!)} className="p-1 bg-white rounded-full shadow hover:bg-gray-100">
                                          <Smile className="w-4 h-4 text-gray-600" />
                                        </button>
                                        {isSent && (
                                          <button onClick={() => handleDeleteMessage(msg.id!)} className="p-1 bg-white rounded-full shadow hover:bg-red-50">
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {showEmojiPicker === msg.id && (
                                      <div className="absolute top-0 right-full mr-2 bg-white rounded-lg shadow-lg p-2 flex gap-2">
                                        {EMOJI_REACTIONS.map((emoji) => (
                                          <button key={emoji} onClick={() => handleReaction(msg.id!, emoji)}
                                            className="text-xl hover:scale-125 transition">{emoji}</button>
                                        ))}
                                      </div>
                                    )}
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

                    <div className="bg-white border-t p-4">
                      <div className="flex gap-2">
                        <input ref={inputRef} type="text" value={newMessage}
                          onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                          onKeyPress={(e) => { if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); handleSendMessage(); } }}
                          placeholder="Type a message..." className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          disabled={loading} />
                        <button onClick={handleSendMessage} disabled={!newMessage.trim() || loading || sending}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 min-w-[80px]">
                          {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                          {sending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                      {!isConnected && <p className="text-xs text-red-600 mt-2">⚠️ WebSocket disconnected. Messages will be sent via HTTP.</p>}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
                    <div className="text-center">
                      <MessagesSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Select a user to start chatting</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <style jsx>{`
        .highlight-message {
          animation: highlight 2s ease;
        }
        @keyframes highlight {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.1); }
        }
      `}</style>
    </ProtectedRoute>
  );
}