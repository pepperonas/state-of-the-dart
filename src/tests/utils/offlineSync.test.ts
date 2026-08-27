import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * `offlineSync` talks to IndexedDB through `idb`. Rather than pull in a
 * fake-indexeddb dependency, the module is mocked with an in-memory store that
 * implements the handful of methods the code actually calls. The logic under
 * test — the retry policy, the TTL, the cache-fallback order — is the app's own
 * and runs unchanged.
 */
type Row = Record<string, unknown> & { id?: string; key?: string };

const stores: Record<string, Map<string, Row>> = {
  pendingActions: new Map(),
  cachedData: new Map(),
};

const keyFor = (store: string, value: Row) =>
  String(store === 'pendingActions' ? value.id : value.key);

vi.mock('idb', () => ({
  openDB: async () => ({
    put: async (store: string, value: Row) => {
      stores[store].set(keyFor(store, value), { ...value });
    },
    get: async (store: string, key: string) => stores[store].get(key),
    getAll: async (store: string) => [...stores[store].values()],
    getAllFromIndex: async (store: string, _index: string) =>
      [...stores[store].values()].sort(
        (a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0)
      ),
    delete: async (store: string, key: string) => {
      stores[store].delete(key);
    },
    count: async (store: string) => stores[store].size,
    objectStoreNames: { contains: () => true },
  }),
}));

import {
  isOnline, queueAction, getPendingActions, removePendingAction,
  cacheData, getCachedData, clearExpiredCache, syncPendingActions,
  getPendingCount, setupConnectivityListener, offlineFirst,
} from '../../utils/offlineSync';

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });

beforeEach(() => {
  stores.pendingActions.clear();
  stores.cachedData.clear();
  setOnline(true);
  vi.useRealTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('isOnline', () => {
  it('reflects the browser', () => {
    setOnline(true);
    expect(isOnline()).toBe(true);
    setOnline(false);
    expect(isOnline()).toBe(false);
  });
});

describe('the pending-action queue', () => {
  it('stores an action and hands it back', async () => {
    await queueAction({ type: 'create', endpoint: '/api/matches', data: { a: 1 } });
    const pending = await getPendingActions();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ type: 'create', endpoint: '/api/matches', retries: 0 });
    expect(pending[0].id).toBeTruthy();
  });

  it('returns actions oldest first, so replay preserves order', async () => {
    await queueAction({ type: 'create', endpoint: '/first', data: {} });
    await new Promise((r) => setTimeout(r, 5));
    await queueAction({ type: 'update', endpoint: '/second', data: {} });
    const pending = await getPendingActions();
    expect(pending.map((a) => a.endpoint)).toEqual(['/first', '/second']);
  });

  it('gives each action its own id, even queued in the same tick', async () => {
    await Promise.all([
      queueAction({ type: 'create', endpoint: '/a', data: {} }),
      queueAction({ type: 'create', endpoint: '/b', data: {} }),
      queueAction({ type: 'create', endpoint: '/c', data: {} }),
    ]);
    expect(await getPendingCount()).toBe(3);
  });

  it('removes one by id', async () => {
    await queueAction({ type: 'delete', endpoint: '/x', data: {} });
    const [action] = await getPendingActions();
    await removePendingAction(action.id);
    expect(await getPendingCount()).toBe(0);
  });
});

describe('syncPendingActions', () => {
  const queue = async (n: number) => {
    for (let i = 0; i < n; i++) {
      await queueAction({ type: 'create', endpoint: `/e${i}`, data: {} });
    }
  };

  it('does nothing while offline — the queue is the whole point', async () => {
    setOnline(false);
    await queue(2);
    const call = vi.fn();
    expect(await syncPendingActions(call)).toEqual({ synced: 0, failed: 0 });
    expect(call).not.toHaveBeenCalled();
    expect(await getPendingCount()).toBe(2);
  });

  it('removes an action once the server accepts it', async () => {
    await queue(3);
    const result = await syncPendingActions(async () => true);
    expect(result).toEqual({ synced: 3, failed: 0 });
    expect(await getPendingCount()).toBe(0);
  });

  /** A rejected action must survive, or the user silently loses the write. */
  it('keeps a rejected action and counts the retry', async () => {
    await queue(1);
    await syncPendingActions(async () => false);
    const [action] = await getPendingActions();
    expect(action.retries).toBe(1);
    expect(await getPendingCount()).toBe(1);
  });

  it('gives up after five retries rather than retrying forever', async () => {
    await queue(1);
    for (let attempt = 1; attempt <= 4; attempt++) {
      const r = await syncPendingActions(async () => false);
      expect(r, `attempt ${attempt}`).toEqual({ synced: 0, failed: 0 });
      expect(await getPendingCount()).toBe(1);
    }
    // The fifth rejection reaches the limit and drops it.
    const last = await syncPendingActions(async () => false);
    expect(last).toEqual({ synced: 0, failed: 1 });
    expect(await getPendingCount()).toBe(0);
  });

  it('a throwing call counts as failed and does not abort the rest', async () => {
    await queue(3);
    let n = 0;
    const result = await syncPendingActions(async () => {
      n++;
      if (n === 1) throw new Error('network');
      return true;
    });
    expect(n).toBe(3);
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('an empty queue is a no-op', async () => {
    expect(await syncPendingActions(async () => true)).toEqual({ synced: 0, failed: 0 });
  });
});

describe('the local cache', () => {
  it('round-trips a value', async () => {
    await cacheData('players', [{ id: 'p1' }]);
    expect(await getCachedData('players')).toEqual([{ id: 'p1' }]);
  });

  it('returns null for a key never written', async () => {
    expect(await getCachedData('nothing')).toBeNull();
  });

  it('expires a value once its TTL has passed', async () => {
    await cacheData('short', 'value', 1);
    expect(await getCachedData('short')).toBe('value');
    vi.setSystemTime(Date.now() + 2000);
    expect(await getCachedData('short')).toBeNull();
  });

  /** An expired entry is deleted, not merely hidden, or it lingers forever. */
  it('deletes the expired entry rather than only hiding it', async () => {
    await cacheData('short', 'value', 1);
    vi.setSystemTime(Date.now() + 2000);
    await getCachedData('short');
    expect(stores.cachedData.size).toBe(0);
  });

  it('clearExpiredCache removes only what has expired', async () => {
    await cacheData('stale', 1, 1);
    await cacheData('fresh', 2, 3600);
    vi.setSystemTime(Date.now() + 2000);
    await clearExpiredCache();
    expect(await getCachedData('fresh')).toBe(2);
    expect(stores.cachedData.has('stale')).toBe(false);
  });
});

describe('offlineFirst', () => {
  it('serves the cache before touching the network', async () => {
    await cacheData('key', 'cached');
    const fetcher = vi.fn(async () => 'fresh');
    expect(await offlineFirst('key', fetcher)).toBe('cached');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fetches and caches when nothing is stored', async () => {
    const fetcher = vi.fn(async () => 'fresh');
    expect(await offlineFirst('key', fetcher)).toBe('fresh');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(await getCachedData('key')).toBe('fresh');
  });

  it('forceRefresh goes to the network even with a warm cache', async () => {
    await cacheData('key', 'cached');
    const fetcher = vi.fn(async () => 'fresh');
    expect(await offlineFirst('key', fetcher, { forceRefresh: true })).toBe('fresh');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  /** A failed refresh must not lose data the user already had. */
  it('falls back to the cache when the network throws', async () => {
    await cacheData('key', 'cached');
    const fetcher = vi.fn(async () => { throw new Error('boom'); });
    expect(await offlineFirst('key', fetcher, { forceRefresh: true })).toBe('cached');
  });

  it('rethrows when the network fails and there is no cache', async () => {
    await expect(
      offlineFirst('key', async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');
  });

  it('offline with no cache is an explicit error, not a hang', async () => {
    setOnline(false);
    await expect(offlineFirst('key', async () => 'fresh')).rejects.toThrow(/Offline/);
  });
});

describe('setupConnectivityListener', () => {
  it('fires the callbacks on the browser events', () => {
    const onOnline = vi.fn(), onOffline = vi.fn();
    const cleanup = setupConnectivityListener(onOnline, onOffline);
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('offline'));
    expect(onOnline).toHaveBeenCalledOnce();
    expect(onOffline).toHaveBeenCalledOnce();
    cleanup();
  });

  /** A listener that outlives its component leaks and fires into dead state. */
  it('the returned cleanup actually unsubscribes', () => {
    const onOnline = vi.fn(), onOffline = vi.fn();
    setupConnectivityListener(onOnline, onOffline)();
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('offline'));
    expect(onOnline).not.toHaveBeenCalled();
    expect(onOffline).not.toHaveBeenCalled();
  });
});
