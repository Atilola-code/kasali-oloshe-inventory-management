// src/services/api.ts - FIXED VERSION
const API_URL = 'https://kasali-oloshe.onrender.com';

// CRITICAL FIX: Reduce cache duration
const CACHE_DURATION = 10 * 1000; // 10 seconds instead of 5 minutes
const CACHE_VERSION = 'v1';

const cache = new Map<string, { data: any; timestamp: number; etag?: string }>();

// Helper to refresh token
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.error('No refresh token available');
      return null;
    }
    
    const response = await fetch(`${API_URL}/api/users/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      return data.access;
    }
    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

// CRITICAL FIX: Clear related caches when data changes
const CACHE_DEPENDENCIES: Record<string, string[]> = {
  '/api/sales/': [
    '/api/sales/',
    '/api/sales/credits/',
    '/api/sales/daily-report/',
    '/api/inventory/', // Sales affect inventory
  ],
  '/api/purchase-orders/': [
    '/api/purchase-orders/',
    '/api/purchase-orders/statistics/',
    '/api/inventory/', // POs affect inventory when received
  ],
  '/api/sales/credits/': [
    '/api/sales/credits/',
    '/api/sales/',
  ],
  '/api/inventory/': [
    '/api/inventory/',
    '/api/purchase-orders/statistics/',
  ],
  '/api/sales/deposits/': [
    '/api/sales/deposits/',
  ],
};

export function clearRelatedCaches(endpoint: string) {
  const basePath = endpoint.split('?')[0].replace(/\/\d+\/$/, '/');
  const relatedEndpoints = CACHE_DEPENDENCIES[basePath] || [basePath];
  
  let cleared = 0;
  for (const key of cache.keys()) {
    const keyEndpoint = key.split(':')[1];
    if (relatedEndpoints.some(ep => keyEndpoint.startsWith(ep))) {
      cache.delete(key);
      cleared++;
    }
  }
  
  console.log(`🗑️ Cleared ${cleared} related cache entries for ${endpoint}`);
  return cleared;
}

// Main API fetch function
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const method = options.method || 'GET';
  const isCacheable = ['GET', 'HEAD'].includes(method.toUpperCase());
  
  const cacheKey = `${CACHE_VERSION}:${endpoint}:${JSON.stringify(options)}`;
  
  // Check cache for GET requests
  if (isCacheable) {
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Cache hit:', endpoint);
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  let token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  // First attempt
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 with token refresh
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }
  
  // Cache successful GET responses
  if (isCacheable && response.ok) {
    try {
      const data = await response.clone().json();
      const etag = response.headers.get('etag');
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        etag: etag || undefined
      });
      console.log('💾 Cached response for:', endpoint);
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }
  
  // CRITICAL FIX: Clear related caches for mutations
  if (!isCacheable && response.ok) {
    clearRelatedCaches(endpoint);
  }
  
  return response;
}

export function clearApiCache() {
  cache.clear();
  console.log('🗑️ All cache cleared');
}

export function clearCacheByEndpoint(endpointPattern: string | RegExp) {
  let cleared = 0;
  for (const key of cache.keys()) {
    const endpoint = key.split(':')[1];
    if (typeof endpointPattern === 'string' && endpoint.includes(endpointPattern)) {
      cache.delete(key);
      cleared++;
    } else if (endpointPattern instanceof RegExp && endpointPattern.test(endpoint)) {
      cache.delete(key);
      cleared++;
    }
  }
  console.log(`🗑️ Cleared ${cleared} cache entries for pattern: ${endpointPattern}`);
}

// SALES - with proper cache invalidation
export async function createSale(saleData: any) {
  try {
    const response = await apiFetch('/api/sales/', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create sale: ${response.status}`);
    }
    
    const result = await response.json();
    
    // CRITICAL FIX: Force immediate cache clear
    clearRelatedCaches('/api/sales/');
    
    return result;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
}

// PURCHASE ORDERS - with proper cache invalidation
export async function createPurchaseOrder(poData: any) {
  try {
    const response = await apiFetch('/api/purchase-orders/', {
      method: 'POST',
      body: JSON.stringify(poData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create purchase order: ${response.status}`);
    }
    
    const result = await response.json();
    
    // CRITICAL FIX: Force immediate cache clear
    clearRelatedCaches('/api/purchase-orders/');
    
    return result;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
}

// CREDITS - with proper cache invalidation
export async function clearCredit(creditId: number, paymentData: any) {
  try {
    const response = await apiFetch(`/api/sales/credits/${creditId}/clear/`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear credit: ${response.status}`);
    }
    
    const result = await response.json();
    
    // CRITICAL FIX: Force immediate cache clear
    clearRelatedCaches('/api/sales/credits/');
    
    return result;
  } catch (error) {
    console.error('Error clearing credit:', error);
    throw error;
  }
}

// Update PO Status - with cache invalidation
export async function updatePOStatus(poId: number, newStatus: string) {
  try {
    const response = await apiFetch(`/api/purchase-orders/${poId}/change_status/`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update PO status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // CRITICAL FIX: Clear related caches
    clearRelatedCaches('/api/purchase-orders/');
    
    return result;
  } catch (error) {
    console.error('Error updating PO status:', error);
    throw error;
  }
}

// Export other functions (keeping them for completeness)
export { API_URL };
export * from './api'; // Keep all other existing exports