import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setAuthToken, removeAuthToken } from '../services/api';
import { syncService } from '../services/sync';

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  emailVerified: boolean;
  isAdmin?: boolean;
  subscriptionStatus: string;
  subscriptionPlan?: string;
  trialEndsAt?: number;
  subscriptionEndsAt?: number;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  googleAuth: () => void;
  refreshUser: () => Promise<void>;
  triggerSync: () => Promise<void>;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  trialDaysLeft: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await api.auth.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      removeAuthToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    setAuthToken(response.token);
    setUser(response.user);
    
    // Trigger initial sync after login
    setTimeout(() => triggerSync(), 1000);
  };

  const register = async (email: string, password: string, name: string) => {
    await api.auth.register(email, password, name);
    // Don't auto-login, user needs to verify email
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  const googleAuth = () => {
    api.auth.googleAuth();
  };

  const refreshUser = async () => {
    try {
      const userData = await api.auth.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const triggerSync = async () => {
    try {
      // Note: We need tenantId and storage from TenantContext
      // This will be called from App when both contexts are available
      console.log('Sync triggered from AuthContext');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const isAuthenticated = !!user;

  const hasActiveSubscription = user
    ? user.subscriptionStatus === 'lifetime' ||
      user.subscriptionStatus === 'active' ||
      (user.subscriptionStatus === 'trial' && (user.trialEndsAt || 0) > Date.now())
    : false;

  const trialDaysLeft = user && user.subscriptionStatus === 'trial' && user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        googleAuth,
        refreshUser,
        triggerSync,
        isAuthenticated,
        hasActiveSubscription,
        trialDaysLeft,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
