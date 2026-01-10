// src/services/api.ts - COMPREHENSIVE VERSION
const API_URL = 'https://kasali-oloshe.onrender.com';

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      return data.access;
    } else {
      console.error('Token refresh failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

const trackCacheHit = (endpoint: string, hit: boolean) => {
  const key = `cache_stats_${endpoint}`;
  const stats = JSON.parse(localStorage.getItem(key) || '{"hits":0,"misses":0}');
  
  if (hit) stats.hits++;
  else stats.misses++;
  
  localStorage.setItem(key, JSON.stringify(stats));
  
  const hitRate = stats.hits / (stats.hits + stats.misses);
  if (hitRate < 0.3) {
    console.warn(`Low cache hit rate for ${endpoint}: ${(hitRate * 100).toFixed(1)}%`);
  }
};


const cache = new Map<string, { data: any; timestamp: number; etag?: string }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_VERSION = 'v1'; // Change this when API structure changes


// Main API fetch function with auto token refresh
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const method = options.method || 'GET';
  const isCacheable = ['GET', 'HEAD'].includes(method.toUpperCase());
  
  // Create a unique cache key with versioning
  const cacheKey = `${CACHE_VERSION}:${endpoint}:${JSON.stringify(options)}`;
  
  // Check cache for GET requests
  if (isCacheable) {
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Cache hit:', endpoint);
      trackCacheHit(endpoint, true);

      // Return a new response object to avoid mutation issues
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    trackCacheHit(endpoint, false);
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

  // Cache the response
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
        etag: etag || undefined // Convert null to undefined
      });
      console.log('Cached response for:', endpoint);
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }
  
  return response;
}

export function clearApiCache() {
  cache.clear();
  console.log('Cache cleared');
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
  console.log(`Cleared ${cleared} cache entries for pattern: ${endpointPattern}`);
}

// USER MANAGEMENT
export async function fetchUsers() {
  try {
    const response = await apiFetch('/api/users/');
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// INVENTORY/PRODUCTS
export async function fetchProducts() {
  try {
    const response = await apiFetch('/api/inventory/');
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export async function createProduct(productData: any) {
  try {
    const response = await apiFetch('/api/inventory/', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create product: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(id: number, productData: any) {
  try {
    const response = await apiFetch(`/api/inventory/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    if (!response.ok) {
      throw new Error(`Failed to update product: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id: number) {
  try {
    const response = await apiFetch(`/api/inventory/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete product: ${response.status}`);
    }
    return response.ok;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// SALES
export async function fetchSales(params?: { start_date?: string; end_date?: string }) {
  try {
    let url = '/api/sales/';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      const queryString = queryParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    
    const response = await apiFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sales: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
}

export async function createSale(saleData: any) {
  try {
    const response = await apiFetch('/api/sales/', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create sale: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
}

export async function fetchSaleById(id: string) {
  try {
    const response = await apiFetch(`/api/sales/${id}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sale: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching sale:', error);
    throw error;
  }
}

export async function updateSale(id: string, saleData: any) {
  try {
    const response = await apiFetch(`/api/sales/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(saleData),
    });
    if (!response.ok) {
      throw new Error(`Failed to update sale: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
}

// CREDITS/OUTSTANDING
export async function fetchCredits(status?: string) {
  try {
    let url = '/api/sales/credits/';
    if (status && status !== 'all') {
      url += `?status=${status}`;
    }
    
    const response = await apiFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch credits: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching credits:', error);
    throw error;
  }
}

export async function clearCredit(creditId: number, paymentData: any) {
  try {
    const response = await apiFetch(`/api/sales/credits/${creditId}/clear/`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    if (!response.ok) {
      throw new Error(`Failed to clear credit: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error clearing credit:', error);
    throw error;
  }
}

export async function markCreditAsCleared(creditId: number) {
  try {
    const response = await apiFetch(`/api/sales/credits/${creditId}/clear/`, {
      method: 'POST',
      body: JSON.stringify({
        amount_paid: 0,
        customer_name: '',
        payment_method: 'cash',
        remarks: 'Marked as cleared'
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to mark credit as cleared: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error marking credit as cleared:', error);
    throw error;
  }
}

export async function markCreditAsPartial(creditId: number) {
  try {
    const response = await apiFetch(`/api/sales/credits/${creditId}/mark-partial/`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to mark credit as partial: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error marking credit as partial:', error);
    throw error;
  }
}

// DEPOSITS
export async function fetchDeposits() {
  try {
    const response = await apiFetch('/api/sales/deposits/');
    if (!response.ok) {
      throw new Error(`Failed to fetch deposits: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching deposits:', error);
    throw error;
  }
}

export async function createDeposit(depositData: any) {
  try {
    const response = await apiFetch('/api/sales/deposits/', {
      method: 'POST',
      body: JSON.stringify(depositData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create deposit: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating deposit:', error);
    throw error;
  }
}

// PURCHASE ORDERS
export async function fetchPurchaseOrders(status?: string) {
  try {
    let url = '/api/purchase-orders/';
    if (status && status !== 'all') {
      url += `?status=${status}`;
    }
    
    const response = await apiFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch purchase orders: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    throw error;
  }
}

export async function fetchPOStatistics() {
  try {
    const response = await apiFetch('/api/purchase-orders/statistics/');
    if (!response.ok) {
      throw new Error(`Failed to fetch PO statistics: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching PO statistics:', error);
    throw error;
  }
}

export async function createPurchaseOrder(poData: any) {
  try {
    const response = await apiFetch('/api/purchase-orders/', {
      method: 'POST',
      body: JSON.stringify(poData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create purchase order: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
}

export async function updatePOStatus(poId: number, newStatus: string) {
  try {
    const response = await apiFetch(`/api/purchase-orders/${poId}/change_status/`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update PO status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating PO status:', error);
    throw error;
  }
}

// REPORTS
export async function fetchDailyReport(startDate: string, endDate: string) {
  try {
    const response = await apiFetch(`/api/sales/daily-report/?start_date=${startDate}&end_date=${endDate}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch daily report: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching daily report:', error);
    throw error;
  }
}

// STOP SALE
export async function fetchStopSaleStatus() {
  try {
    const response = await apiFetch('/api/sales/stop-sale/status/');
    if (!response.ok) {
      throw new Error(`Failed to fetch stop sale status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stop sale status:', error);
    throw error;
  }
}

export async function checkCanCreateSale() {
  try {
    const response = await apiFetch('/api/sales/stop-sale/can-create/');
    if (!response.ok) {
      throw new Error(`Failed to check if can create sale: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking can create sale:', error);
    throw error;
  }
}

export async function toggleStopSale() {
  try {
    const response = await apiFetch('/api/sales/stop-sale/toggle/', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to toggle stop sale: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error toggling stop sale:', error);
    throw error;
  }
}

// Utility function for currency formatting
export const formatCurrency = (amount: number | string | undefined) => {
  let numAmount = 0;
  
  if (typeof amount === 'number') {
    numAmount = amount;
  } else if (typeof amount === 'string') {
    numAmount = parseFloat(amount) || 0;
  }
  
  if (isNaN(numAmount)) {
    numAmount = 0;
  }
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numAmount).replace('NGN', '₦').trim();
};

// Export the API URL for use in other places if needed
export { API_URL };