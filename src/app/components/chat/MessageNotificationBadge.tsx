// src/app/components/chat/MessageNotificationBadge.tsx
"use client";
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useRouter, usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { apiFetch } from '@/services/api';

export default function MessageNotificationBadge() {
  const { newMessageNotification, clearNotification } = useWebSocket();
  const [totalUnread, setTotalUnread] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch total unread count
  useEffect(() => {
    fetchUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show popup when new message arrives (only if not on chat page)
  useEffect(() => {
    if (newMessageNotification && pathname !== '/live-chat') {
      setShowPopup(true);
      fetchUnreadCount();
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [newMessageNotification, pathname]);

  const fetchUnreadCount = async () => {
    try {
      const response = await apiFetch('/api/chat/unread-count/');
      if (response.ok) {
        const data = await response.json();
        setTotalUnread(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleClick = () => {
    router.push('/live-chat');
    setShowPopup(false);
    clearNotification();
  };

  const handleDismiss = () => {
    setShowPopup(false);
    clearNotification();
  };

  // Don't show on chat page
  if (pathname === '/live-chat') return null;

  return (
    <>
      {/* Notification Badge (always visible) */}
      <button
        onClick={handleClick}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
        title={`${totalUnread} unread messages`}
      >
        <MessageCircle className="w-5 h-5 text-gray-600" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* New Message Popup */}
      {showPopup && newMessageNotification && (
        <div className="fixed top-20 right-6 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 animate-slide-in">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {newMessageNotification.sender?.first_name?.[0] || 'U'}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">
                  {newMessageNotification.sender?.first_name} {newMessageNotification.sender?.last_name}
                </p>
                <p className="text-xs text-gray-500">New message</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-gray-50 rounded p-2 mb-3">
            <p className="text-sm text-gray-700 line-clamp-2">
              {newMessageNotification.message}
            </p>
          </div>
          
          <button
            onClick={handleClick}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            View Message
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}