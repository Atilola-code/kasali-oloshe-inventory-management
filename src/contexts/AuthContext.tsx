// src/contexts/AuthContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { showSuccess, showError, showInfo } from '@/app/utils/toast';
import { User } from "@/app/types";
import { apiFetch, API_URL } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (err) {
        console.error('Failed to parse user data:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // ✅ FIXED: Use fetch directly for login (not apiFetch - no token yet)
      const response = await fetch(`${API_URL}/api/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Invalid credentials');
      }

      const data = await response.json();
      
      console.log('✅ Login successful:', data);
      
      // Store tokens
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      
      // Store user role from response
      if (data.user && data.user.role) {
        localStorage.setItem('user_role', data.user.role);
      }
      
      // Store full user info
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      showSuccess(`Welcome back, ${data.user.first_name}!`);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      showError(error.message || 'Login failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    setUser(null);
    showInfo("Logged out successfully");
  };

  const register = async (userData: any) => {
    try {
      // ✅ FIXED: Use apiFetch for register
      const res = await apiFetch('/api/users/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (!res.ok) {
        const error = await res.json();
        const errorMessage = error.detail || 
                          error.message || 
                          JSON.stringify(error) ||
                          'Registration failed';
        showError(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await res.json();
      showSuccess(`User ${result.first_name} ${result.last_name} registered successfully!`);
      return result;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}