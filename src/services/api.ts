// src/services/api.ts 

const MAX_RETRIES = 2;
const TIMEOUT_MS = 15000;
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kasali-oloshe.onrender.com';


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
export async function apiFetch(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
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
  
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    // First attempt
    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Handle 401 with token refresh
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal
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
      
      // Force refresh related dashboard data
      if (endpoint.includes('/sales/credits/') || endpoint.includes('/sales/deposits/')) {
        triggerDashboardRefresh();
      }
    }
    
    return response;
  } catch (error: any) {
    // Network error handling with retry
    if (error.name === 'AbortError') {
      console.warn('Request timed out:', endpoint);
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES})...`);
        return apiFetch(endpoint, options, retryCount + 1);
      }
      throw new Error('Network timeout. Please check your connection.');
    }
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES}) due to network error...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return apiFetch(endpoint, options, retryCount + 1);
    }
    
    throw new Error(`Network error: ${error.message || 'Failed to connect to server'}`);
  }
}

// Add this function to trigger dashboard refresh
function triggerDashboardRefresh() {
  window.dispatchEvent(new CustomEvent('dashboardRefresh', {
    detail: { timestamp: Date.now() }
  }));
  console.log('🔄 Dashboard refresh triggered');
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

// ============================================================================
// SPECIFIC API FUNCTIONS
// ============================================================================

// SALES - GET
export async function getSales() {
  const response = await apiFetch('/api/sales/');
  if (!response.ok) {
    throw new Error(`Failed to fetch sales: ${response.status}`);
  }
  return response.json();
}

// SALES - CREATE
export async function createSale(saleData: any) {
  try {
    const response = await apiFetch('/api/sales/', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || `Failed to create sale: ${response.status}`);
    }
    
    const result = await response.json();
    clearRelatedCaches('/api/sales/');
    return result;
  } catch (error: any) {
    console.error('Error creating sale:', error);
    throw error;
  }
}

// PURCHASE ORDERS - GET ALL
export async function getPurchaseOrders(params?: { status?: string; page?: number; page_size?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }
  
  const url = `/api/purchase-orders/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiFetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch purchase orders: ${response.status}`);
  }
  
  return response.json();
}

// PURCHASE ORDERS - GET ONE
export async function getPurchaseOrder(id: number) {
  const response = await apiFetch(`/api/purchase-orders/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch purchase order: ${response.status}`);
  }
  return response.json();
}

// PURCHASE ORDERS - CREATE
export async function createPurchaseOrder(poData: any) {
  try {
    const response = await apiFetch('/api/purchase-orders/', {
      method: 'POST',
      body: JSON.stringify(poData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || `Failed to create purchase order: ${response.status}`);
    }
    
    const result = await response.json();
    clearRelatedCaches('/api/purchase-orders/');
    return result;
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
}

// PURCHASE ORDERS - GET STATISTICS
export async function getPOStatistics() {
  const response = await apiFetch('/api/purchase-orders/statistics/');
  if (!response.ok) {
    throw new Error(`Failed to fetch PO statistics: ${response.status}`);
  }
  return response.json();
}

// CREDITS - GET
export async function getCredits(status?: string) {
  const url = status ? `/api/sales/credits/?status=${status}` : '/api/sales/credits/';
  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch credits: ${response.status}`);
  }
  return response.json();
}

// CREDITS - CLEAR
export async function clearCredit(creditId: number, paymentData: any) {
  try {
    const response = await apiFetch(`/api/sales/credits/${creditId}/clear/`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to clear credit: ${response.status}`);
    }
    
    const result = await response.json();
    clearRelatedCaches('/api/sales/credits/');
    return result;
  } catch (error: any) {
    console.error('Error clearing credit:', error);
    throw error;
  }
}

// PURCHASE ORDERS - UPDATE STATUS
export async function updatePOStatus(poId: number, newStatus: string) {
  try {
    const response = await apiFetch(`/api/purchase-orders/${poId}/change_status/`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update PO status: ${response.status}`);
    }
    
    const result = await response.json();
    clearRelatedCaches('/api/purchase-orders/');
    return result;
  } catch (error: any) {
    console.error('Error updating PO status:', error);
    throw error;
  }
}

// DEPOSITS - GET
export async function getDeposits() {
  const response = await apiFetch('/api/sales/deposits/');
  if (!response.ok) {
    throw new Error(`Failed to fetch deposits: ${response.status}`);
  }
  return response.json();
}

// DEPOSITS - CREATE
export async function createDeposit(depositData: any) {
  try {
    const response = await apiFetch('/api/sales/deposits/', {
      method: 'POST',
      body: JSON.stringify(depositData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to create deposit: ${response.status}`);
    }
    
    const result = await response.json();
    clearRelatedCaches('/api/sales/deposits/');
    return result;
  } catch (error: any) {
    console.error('Error creating deposit:', error);
    throw error;
  }
}

// INVENTORY - GET
export async function getInventory() {
  const response = await apiFetch('/api/inventory/');
  if (!response.ok) {
    throw new Error(`Failed to fetch inventory: ${response.status}`);
  }
  return response.json();
}