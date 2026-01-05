// src/services/api.ts
const API_URL = 'https://kasali-oloshe.onrender.com';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  let token = localStorage.getItem('access_token');
  let refreshToken = localStorage.getItem('refresh_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  // If token expired, try to refresh it
  if (response.status === 401 && refreshToken) {
    try {
      const refreshResponse = await fetch(`${API_URL}/api/users/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        localStorage.setItem('access_token', data.access);
        
        // Retry the original request with new token
        token = data.access;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${token}`,
          },
        });
      } else {
        // Refresh failed, clear storage
        localStorage.clear();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    } catch (error) {
      localStorage.clear();
      window.location.href = '/login';
      throw error;
    }
  }
  
  return response;
}


async function fetchUsers() {
  try {
    const response = await apiFetch('/api/users/');
    if (!response.ok) throw new Error('Failed to fetch users');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}