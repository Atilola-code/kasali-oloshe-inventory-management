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

// Main API fetch function with auto token refresh
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  let token = localStorage.getItem('access_token');
  
  // First attempt
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  // If token expired (401), try to refresh it
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Retry with new token
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
          ...options.headers,
        },
      });
    } else {
      // Refresh failed, clear storage and redirect to login
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }
  
  return response;
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