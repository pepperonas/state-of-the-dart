import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { safeGetItem, safeSetItem, TenantStorage } from '../utils/storage';
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
  // Create a default tenant for authenticated users
  const defaultTenant: Tenant = {
    id: 'default',
    name: 'Default',
    avatar: '👤',
    createdAt: new Date(),
    lastActive: new Date(),
  };
  
  const [tenants] = useState<Tenant[]>([defaultTenant]);
  const [currentTenant] = useState<Tenant | null>(defaultTenant);
  const [storage] = useState<TenantStorage | null>(new TenantStorage('default'));
  
  // Dummy functions for compatibility
  const setCurrentTenant = () => {};
  const addTenant = () => defaultTenant;
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
