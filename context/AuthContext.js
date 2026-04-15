'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { resetAllStores } from '@/store/resetAllStores';

// Context only carries the action functions (login/signup/logout).
// State (user, loading) lives in useAuthStore so any component can
// subscribe directly without Context propagation overhead.
const AuthContext = createContext();

export const useAuth = () => {
  const { user, loading } = useAuthStore();
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return { user, loading, ...context };
};

export const AuthProvider = ({ children }) => {
  const { _setUser, _setLoading, _clearUser } = useAuthStore();
  const router = useRouter();

  // On mount: restore session from localStorage (client-side only)
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        _setUser(JSON.parse(userData));
      }
    } catch {
      // Corrupted localStorage data — clear it and let user log in again
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      _setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await authAPI.login(credentials);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    _setUser(data);
    router.push('/dashboard');
  };

  const signup = async (userData) => {
    const data = await authAPI.signup(userData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    _setUser(data);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    _clearUser();
    resetAllStores(); // clear all cached org data so next user starts fresh
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
