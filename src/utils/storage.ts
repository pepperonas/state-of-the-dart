// Safe localStorage utilities with error handling and multi-tenant support

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Safely get data from localStorage with error handling
 */
export const safeGetItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    
    const parsed = JSON.parse(item);
    return parsed as T;
  } catch (error) {
    console.error(`Failed to get item from localStorage: ${key}`, error);
    return defaultValue;
  }
};

/**
 * Safely set data to localStorage with error handling
 */
export const safeSetItem = (key: string, value: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set item in localStorage: ${key}`, error);
    
    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Consider clearing old data.');
    }
    
    return false;
  }
};

/**
 * Safely remove data from localStorage
 */
export const safeRemoveItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove item from localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Get all keys for a specific tenant
 */
export const getTenantKeys = (tenantId: string): string[] => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`tenant_${tenantId}_`)) {
        keys.push(key);
      }
    }
    return keys;
  } catch (error) {
    console.error('Failed to get tenant keys', error);
    return [];
  }
};

/**
 * Clear all data for a specific tenant
 */
export const clearTenantData = (tenantId: string): boolean => {
  try {
    const keys = getTenantKeys(tenantId);
    keys.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('Failed to clear tenant data', error);
    return false;
  }
};

/**
 * Debounced localStorage setter
 */
let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export const debouncedSetItem = (
  key: string, 
  value: any, 
  delay: number = 1000
): void => {
  // Clear existing timer for this key
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }
  
  // Set new timer
  debounceTimers[key] = setTimeout(() => {
    safeSetItem(key, value);
    delete debounceTimers[key];
  }, delay);
};

/**
 * Get storage info
 */
export const getStorageInfo = () => {
  try {
    const estimate = navigator.storage?.estimate?.();
    return estimate;
  } catch (error) {
    console.error('Failed to get storage info', error);
    return null;
  }
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Multi-tenant storage wrapper
 */
export class TenantStorage {
  private tenantId: string;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }
  
  private getKey(key: string): string {
    return `tenant_${this.tenantId}_${key}`;
  }
  
  get<T>(key: string, defaultValue: T): T {
    return safeGetItem(this.getKey(key), defaultValue);
  }
  
  set(key: string, value: any): boolean {
    return safeSetItem(this.getKey(key), value);
  }
  
  setDebounced(key: string, value: any, delay?: number): void {
    debouncedSetItem(this.getKey(key), value, delay);
  }
  
  remove(key: string): boolean {
    return safeRemoveItem(this.getKey(key));
  }
  
  clear(): boolean {
    return clearTenantData(this.tenantId);
  }
}
