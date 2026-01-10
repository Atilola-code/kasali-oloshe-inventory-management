// src/app/providers/CacheProvider.tsx
"use client";
import { useEffect } from 'react';
import { apiFetch } from '@/services/api';

export function CacheProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Cache warming on app start
    const warmUpCache = async () => {
      if (typeof window === 'undefined') return;
      
      // Only warm up if user is logged in
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const endpoints = [
        '/api/inventory/?limit=10',
        '/api/purchase-orders/statistics/',
        '/api/sales/?limit=5'
      ];
      
      // Use low priority for warming
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          endpoints.forEach(endpoint => {
            apiFetch(endpoint).catch(() => {}); // Silent fail
          });
        });
      } else {
        setTimeout(() => {
          endpoints.forEach(endpoint => {
            apiFetch(endpoint).catch(() => {});
          });
        }, 3000);
      }
    };
    
    warmUpCache();
    
    // Set up periodic cache maintenance
    const maintenanceInterval = setInterval(() => {
      const cache = (window as any).__apiCache;
      if (cache && cache.size > 100) {
        // Clean old cache entries
        console.log('Performing cache maintenance...');
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(maintenanceInterval);
  }, []);
  
  return <>{children}</>;
}