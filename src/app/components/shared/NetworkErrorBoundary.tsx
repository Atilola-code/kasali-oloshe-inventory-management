// components/shared/NetworkErrorBoundary.tsx
"use client";
import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function NetworkErrorBoundary({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowError(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowError(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline && showError) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Network Connection Lost</h2>
          <p className="text-gray-600 mb-6">
            You're currently offline. Please check your internet connection.
          </p>
          <button
            onClick={() => {
              setIsOnline(navigator.onLine);
              setShowError(false);
            }}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}