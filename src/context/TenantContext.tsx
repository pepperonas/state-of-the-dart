import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TenantStorage, accountScope, claimDefaultCache } from '../utils/storage';
import { useAuth } from './AuthContext';
import { toDateOrNow } from '../utils/dateUtils';

export interface Tenant {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
  lastActive: Date;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  storage: TenantStorage | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  addTenant: (name: string, avatar?: string) => Tenant;
  deleteTenant: (id: string) => void;
  updateTenant: (id: string, updates: Partial<Tenant>) => void;
}

const TenantContext = createContext<TenantContextType | null>(null);

const reviveTenantDates = (tenant: any): Tenant => {
  return {
    ...tenant,
    createdAt: toDateOrNow(tenant.createdAt),
    lastActive: toDateOrNow(tenant.lastActive),
  };
};

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // One "tenant" per signed-in account. Its id IS the cache scope, so every
  // `new TenantStorage(currentTenant.id)` in the app (achievements, export)
  // lands in the account's own cache — see accountScope.
  const { user } = useAuth();
  const userId = user?.id;

  const currentTenant = useMemo<Tenant | null>(() => (userId ? {
    id: accountScope(userId),
    name: 'Default',
    avatar: 'user',
    createdAt: new Date(),
    lastActive: new Date(),
  } : null), [userId]);
  const tenants = useMemo(() => (currentTenant ? [currentTenant] : []), [currentTenant]);

  const storage = useMemo<TenantStorage | null>(() => {
    if (!userId) return null;
    claimDefaultCache(userId);
    return new TenantStorage(accountScope(userId));
  }, [userId]);

  // Dummy functions for compatibility
  const setCurrentTenant = () => {};
  const addTenant = () => currentTenant as Tenant;
  const deleteTenant = () => {};
  const updateTenant = () => {};
  
  return (
    <TenantContext.Provider value={{
      currentTenant,
      tenants,
      storage,
      setCurrentTenant,
      addTenant,
      deleteTenant,
      updateTenant,
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
