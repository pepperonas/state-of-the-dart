import { createContext, useContext } from 'react';

export interface User {
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

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | null>(null);

/** For chrome that may render outside the provider (PageShell in unit tests): null there. */
export const useOptionalAuth = () => useContext(AuthContext);
