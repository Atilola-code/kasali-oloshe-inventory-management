// src/app/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { getUserFromToken } from '../utils/jwt';

export function useAuth() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  function loadUser() {
    try {
      // Get user from JWT token
      const userFromToken = getUserFromToken();
      if (userFromToken) {
        setUser(userFromToken);
        setUserRole(userFromToken.role);
      } else {
        // Fallback to localStorage
        const storedRole = localStorage.getItem('user_role');
        const storedUser = localStorage.getItem('user_info');
        
        if (storedRole) {
          setUserRole(storedRole);
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_info');
    setUserRole(null);
    setUser(null);
  }

  function isAuthenticated() {
    return !!localStorage.getItem('access_token');
  }

  return {
    userRole,
    user,
    loading,
    logout,
    isAuthenticated,
    reloadUser: loadUser,
  };
}