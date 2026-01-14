import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { safeGetItem, safeSetItem, TenantStorage } from '../utils/storage';

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
    createdAt: tenant.createdAt ? new Date(tenant.createdAt) : new Date(),
    lastActive: tenant.lastActive ? new Date(tenant.lastActive) : new Date(),
  };
};

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = safeGetItem<any[]>('tenants', []);
    return saved.map(reviveTenantDates);
  });
  
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(() => {
    const saved = safeGetItem<any>('currentTenant', null);
    return saved ? reviveTenantDates(saved) : null;
  });
  
  const [storage, setStorage] = useState<TenantStorage | null>(
    currentTenant ? new TenantStorage(currentTenant.id) : null
  );
  
  // Save tenants to localStorage
  useEffect(() => {
    safeSetItem('tenants', tenants);
  }, [tenants]);
  
  // Save current tenant and create storage
  useEffect(() => {
    if (currentTenant) {
      safeSetItem('currentTenant', currentTenant);
      setStorage(new TenantStorage(currentTenant.id));
      
      // Update last active
      setTenants(prev => prev.map(t => 
        t.id === currentTenant.id 
          ? { ...t, lastActive: new Date() }
          : t
      ));
    } else {
      safeSetItem('currentTenant', null);
      setStorage(null);
    }
  }, [currentTenant]);
  
  const setCurrentTenant = (tenant: Tenant | null) => {
    setCurrentTenantState(tenant);
  };
  
  const addTenant = (name: string, avatar?: string): Tenant => {
    const newTenant: Tenant = {
      id: uuidv4(),
      name,
      avatar: avatar || name.charAt(0).toUpperCase(),
      createdAt: new Date(),
      lastActive: new Date(),
    };
    
    setTenants(prev => [...prev, newTenant]);
    return newTenant;
  };
  
  const deleteTenant = (id: string) => {
    // Don't delete if it's the current tenant
    if (currentTenant?.id === id) {
      setCurrentTenant(null);
    }
    
    setTenants(prev => prev.filter(t => t.id !== id));
    
    // Clear tenant data from storage
    const tenantStorage = new TenantStorage(id);
    tenantStorage.clear();
  };
  
  const updateTenant = (id: string, updates: Partial<Tenant>) => {
    setTenants(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
    
    if (currentTenant?.id === id) {
      setCurrentTenant({ ...currentTenant, ...updates });
    }
  };
  
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
