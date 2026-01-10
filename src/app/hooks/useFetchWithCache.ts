"use client";
import { useState, useCallback, useRef, useEffect } from 'react';
import { apiFetch, clearCacheByEndpoint } from '@/services/api';

export function useFetchWithCache<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (options: RequestInit = {}) => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch(endpoint, {
        ...options,
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setLastFetched(new Date());
      return result;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
        console.error(`Error fetching ${endpoint}:`, err);
      }
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [endpoint]);

  const invalidateCache = useCallback(() => {
    clearCacheByEndpoint(endpoint);
  }, [endpoint]);

  return {
    data,
    loading,
    error,
    lastFetched,
    fetchData,
    invalidateCache,
    setData // For optimistic updates
  };
}

// Helper hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}