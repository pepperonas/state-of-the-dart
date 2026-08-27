import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setAuthToken, removeAuthToken } from '../services/api';
import { syncService } from '../services/sync';
import { logBuffer } from '../utils/logBuffer';

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

  // Global "session expired" handler. apiClient dispatches `auth:unauthorized` on a
  // 401 for an AUTHENTICATED request — previously the token would expire mid-session
  // and every write silently failed with the user none the wiser. Now we log out and
  // send them to login so they re-authenticate instead of losing data into the void.
  useEffect(() => {
    const onUnauthorized = () => {
      if (!localStorage.getItem('auth_token')) return; // already logged out
      logBuffer.log('info', 'state_change', 'Session expired (401) — logging out');
      removeAuthToken();
      setUser(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const isAuthError = (error: any) => {
      const status = error?.status;
      if (status === 401 || status === 403) return true;
      const msg = error?.message || '';
      return msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized');
    };

    // Session restore gets ONE retry on a non-auth failure.
    //
    // Keeping the token on a network error was already right, but it was not
    // enough: without `user` the app still counts as signed out, so
    // ProtectedRoute bounces to /login and the session is lost in practice —
    // a cold backend or a dropped request at boot logged the user out. This
    // showed up as an intermittently failing E2E test.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const userData = await api.auth.getMe();
        setUser(userData);
        break;
      } catch (error: any) {
        if (isAuthError(error)) {
          console.error('Session rejected:', error);
          removeAuthToken();
          break;
        }
        if (attempt === 0) {
          logBuffer.log('info', 'state_change', 'Session restore failed, retrying once', {
            error: String(error?.message || error),
          });
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        // Give up for this boot, but keep the token: a later request can recover.
        console.error('Failed to load user:', error);
      }
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    setAuthToken(response.token);
    setUser(response.user);
    logBuffer.log('info', 'state_change', 'User logged in', { email: response.user?.email });

    // Trigger initial sync after login
    setTimeout(() => triggerSync(), 1000);
  };

  const register = async (email: string, password: string, name: string) => {
    await api.auth.register(email, password, name);
    // Don't auto-login, user needs to verify email
  };

  const logout = () => {
    logBuffer.log('info', 'state_change', 'User logged out');
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
