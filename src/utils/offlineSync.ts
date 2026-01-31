/**
 * Offline-First Sync Utility
 * Ermöglicht vollständiges Offline-Arbeiten mit automatischer Synchronisation
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import logger from './logger';

// IndexedDB Schema
interface OfflineDB extends DBSchema {
  pendingActions: {
    key: string;
    value: PendingAction;
    indexes: { 'by-timestamp': number };
  };
  cachedData: {
    key: string;
    value: CachedData;
  };
}

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
}

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

const DB_NAME = 'stateofthedart-offline';
const DB_VERSION = 1;

let db: IDBPDatabase<OfflineDB> | null = null;

// Initialize IndexedDB
async function initDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (db) return db;
  
  db = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Pending actions store
      if (!database.objectStoreNames.contains('pendingActions')) {
        const store = database.createObjectStore('pendingActions', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
      
      // Cached data store
      if (!database.objectStoreNames.contains('cachedData')) {
        database.createObjectStore('cachedData', { keyPath: 'key' });
      }
    },
  });
  
  return db;
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Queue an action for later sync
export async function queueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  const database = await initDB();
  
  const pendingAction: PendingAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0,
  };
  
  await database.put('pendingActions', pendingAction);
  logger.debug('[OfflineSync] Action queued:', pendingAction.type, pendingAction.endpoint);
}

// Get all pending actions
export async function getPendingActions(): Promise<PendingAction[]> {
  const database = await initDB();
  return database.getAllFromIndex('pendingActions', 'by-timestamp');
}

// Remove a pending action
export async function removePendingAction(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('pendingActions', id);
}

// Cache data locally
export async function cacheData(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
  const database = await initDB();
  
  const cachedData: CachedData = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + (ttlSeconds * 1000),
  };
  
  await database.put('cachedData', cachedData);
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  const database = await initDB();
  const cached = await database.get('cachedData', key);
  
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() > cached.expiresAt) {
    await database.delete('cachedData', key);
    return null;
  }
  
  return cached.data as T;
}

// Clear expired cache
export async function clearExpiredCache(): Promise<void> {
  const database = await initDB();
  const all = await database.getAll('cachedData');
  const now = Date.now();
  
  for (const item of all) {
    if (now > item.expiresAt) {
      await database.delete('cachedData', item.key);
    }
  }
}

// Sync pending actions with server
export async function syncPendingActions(
  apiCall: (action: PendingAction) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) {
    return { synced: 0, failed: 0 };
  }
  
  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;
  
  for (const action of actions) {
    try {
      const success = await apiCall(action);
      
      if (success) {
        await removePendingAction(action.id);
        synced++;
        logger.debug('[OfflineSync] Action synced:', action.type, action.endpoint);
      } else {
        // Increment retry count
        const database = await initDB();
        action.retries++;
        
        if (action.retries >= 5) {
          // Too many retries, remove
          await removePendingAction(action.id);
          failed++;
          logger.warn('[OfflineSync] Action failed after 5 retries:', action);
        } else {
          await database.put('pendingActions', action);
        }
      }
    } catch (error) {
      logger.error('[OfflineSync] Sync error:', error);
      failed++;
    }
  }
  
  return { synced, failed };
}

// Get pending action count
export async function getPendingCount(): Promise<number> {
  const database = await initDB();
  return database.count('pendingActions');
}

// Listen for online/offline events
export function setupConnectivityListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => {
    logger.info('[OfflineSync] Back online');
    onOnline();
  };
  
  const handleOffline = () => {
    logger.info('[OfflineSync] Gone offline');
    onOffline();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Wrapper for API calls with offline support
export async function offlineFirst<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    ttlSeconds?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<T> {
  const { ttlSeconds = 3600, forceRefresh = false } = options;
  
  // Try cache first if offline or not forcing refresh
  if (!isOnline() || !forceRefresh) {
    const cached = await getCachedData<T>(cacheKey);
    if (cached !== null) {
      logger.debug('[OfflineSync] Returning cached data for:', cacheKey);
      return cached;
    }
  }
  
  // If offline and no cache, throw error
  if (!isOnline()) {
    throw new Error('Offline and no cached data available');
  }
  
  // Fetch fresh data
  try {
    const data = await fetcher();
    await cacheData(cacheKey, data, ttlSeconds);
    return data;
  } catch (error) {
    // On network error, try cache as fallback
    const cached = await getCachedData<T>(cacheKey);
    if (cached !== null) {
      logger.warn('[OfflineSync] Network error, using cached data for:', cacheKey);
      return cached;
    }
    throw error;
  }
}

export default {
  isOnline,
  queueAction,
  getPendingActions,
  removePendingAction,
  cacheData,
  getCachedData,
  clearExpiredCache,
  syncPendingActions,
  getPendingCount,
  setupConnectivityListener,
  offlineFirst,
};
