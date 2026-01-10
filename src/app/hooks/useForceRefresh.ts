// src/hooks/useForceRefresh.ts
import { useCallback } from 'react';
import { clearCacheByEndpoint, clearRelatedCaches } from '@/services/api';

export function useForceRefresh() {
  const forceRefresh = useCallback(async (
    endpoints: string[],
    fetchFunctions: (() => Promise<any>)[]
  ) => {
    // Step 1: Clear all related caches
    endpoints.forEach(endpoint => {
      clearRelatedCaches(endpoint);
      clearCacheByEndpoint(endpoint);
    });
    
    // Step 2: Wait a tiny bit to ensure cache is cleared
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Step 3: Execute all fetch functions in parallel
    try {
      await Promise.all(fetchFunctions.map(fn => fn()));
      console.log('✅ Force refresh completed');
      return true;
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      return false;
    }
  }, []);
  
  return forceRefresh;
}

// Usage example in your components:
/*
const forceRefresh = useForceRefresh();

const handleSaleCreated = async () => {
  await forceRefresh(
    ['/api/sales/', '/api/inventory/'],
    [fetchSales, fetchInventory]
  );
  showSuccess("Sale created!");
};
*/