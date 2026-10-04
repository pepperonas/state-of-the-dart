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
export const safeSetItem = (key: string, value: unknown): boolean => {
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
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export const debouncedSetItem = (
  key: string,
  value: unknown,
  delay: number = 1000
): void => {
  // Clear existing timer for this key
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  // Record the latest value so flushDebouncedSetItem() can write it out early.
  debouncePending[key] = value;

  // Set new timer
  debounceTimers[key] = setTimeout(() => {
    safeSetItem(key, value);
    delete debounceTimers[key];
    delete debouncePending[key];
  }, delay);
};

// Pending values keyed by storage key, so a flush can write the latest value even
// before its debounce timer fires (e.g. on page hide/unload).
const debouncePending: Record<string, unknown> = {};

/**
 * Immediately write out any debounced values whose timers haven't fired yet.
 * Call on `pagehide`/`visibilitychange:hidden` so the last coalesced write isn't
 * lost if the app is backgrounded/closed within the debounce window.
 */
export const flushDebouncedSetItem = (): void => {
  for (const key of Object.keys(debounceTimers)) {
    clearTimeout(debounceTimers[key]);
    delete debounceTimers[key];
    if (key in debouncePending) {
      safeSetItem(key, debouncePending[key]);
      delete debouncePending[key];
    }
  }
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
  } catch {
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
  
  set(key: string, value: unknown): boolean {
    return safeSetItem(this.getKey(key), value);
  }

  setDebounced(key: string, value: unknown, delay?: number): void {
    debouncedSetItem(this.getKey(key), value, delay);
  }
  
  remove(key: string): boolean {
    return safeRemoveItem(this.getKey(key));
  }
  
  clear(): boolean {
    return clearTenantData(this.tenantId);
  }
}

/**
 * Cache scope of one account. Everything used to live under the single scope
 * `default`, so on a shared device the next account inherited the previous
 * one's personal bests, achievement cache, last players — and its queue of
 * unsynced unlocks, which was then POSTed with the wrong token.
 */
export const accountScope = (userId: string): string => `user_${userId}`;

const DEFAULT_CLAIMED_KEY = 'sotd-default-cache-claimed';

/**
 * One-time migration: the first account to sign in after the switch takes
 * over the old shared `default` cache (on almost every device that cache is
 * theirs — including unsynced achievement unlocks, which must not be lost).
 * Later accounts start empty.
 */
export const claimDefaultCache = (userId: string): void => {
  try {
    if (localStorage.getItem(DEFAULT_CLAIMED_KEY)) return;
    const target = accountScope(userId);
    for (const key of getTenantKeys('default')) {
      const moved = key.replace(/^tenant_default_/, `tenant_${target}_`);
      if (localStorage.getItem(moved) === null) {
        const value = localStorage.getItem(key);
        if (value !== null) localStorage.setItem(moved, value);
      }
      localStorage.removeItem(key);
    }
    localStorage.setItem(DEFAULT_CLAIMED_KEY, userId);
  } catch (error) {
    console.error('Failed to migrate the shared cache', error);
  }
};

/** Device-level game saves that belong to whoever is signed in. */
export const DEVICE_GAME_KEYS = [
  'state-of-the-dart-active-match',
  'state-of-the-dart-active-throw',
  'state-of-the-dart-atc-game',
  'state-of-the-dart-shanghai-game',
  'state-of-the-dart-cricket-game',
];

/** Signing out hands the device on: drop the running games with it. */
export const clearDeviceGameState = (): void => {
  DEVICE_GAME_KEYS.forEach(key => safeRemoveItem(key));
};
