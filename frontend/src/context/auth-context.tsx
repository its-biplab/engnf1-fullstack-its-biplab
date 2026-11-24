'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UserResponse,
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
  clearSession,
  fetchCurrentUser,
} from '@/lib/api';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: UserResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<UserResponse | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<UserResponse | null> => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }

    setToken(currentToken);

    const result = await fetchCurrentUser();
    if (result.user) {
      setUser(result.user);
      setStoredUser(result.user);
      setIsLoading(false);
      return result.user;
    } else {
      // Clear token on 401 unauthenticated response
      if (
        result.error?.code === 'UNAUTHENTICATED' ||
        result.error?.code?.startsWith('HTTP_401')
      ) {
        clearSession();
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    // Initial optimistic hydration from localStorage before network validation
    const cachedUser = getStoredUser();
    const cachedToken = getAuthToken();

    if (cachedToken && cachedUser) {
      setUser(cachedUser);
      setToken(cachedToken);
    }

    refreshUser();
  }, [refreshUser]);

  const login = (newToken: string, newUser: UserResponse) => {
    setAuthToken(newToken);
    setStoredUser(newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearSession();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
