import { TenantStorage } from '../utils/storage';
import api from './api';

export interface SyncStatus {
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
}

class SyncService {
  private syncing = false;
  private lastSync: number | null = null;
  private error: string | null = null;
  private listeners: Array<(status: SyncStatus) => void> = [];

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notify() {
    const status: SyncStatus = {
      syncing: this.syncing,
      lastSync: this.lastSync,
      error: this.error,
    };
    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      syncing: this.syncing,
      lastSync: this.lastSync,
      error: this.error,
    };
  }

  /**
   * Perform initial sync after login
   * Uploads all local data to server
   */
  async initialSync(storage: TenantStorage, tenantId: string): Promise<void> {
    if (this.syncing) {
      console.log('Sync already in progress');
      return;
    }

    this.syncing = true;
    this.error = null;
    this.notify();

    try {
      // 1. Sync Tenant
      const tenant = storage.get(`tenant_${tenantId}`, null);
      if (tenant) {
        await api.tenants.create(tenant);
      }

      // 2. Sync Players
      const players = storage.get('players', []);
      for (const player of players) {
        try {
          await api.players.create(player);
        } catch (err) {
          console.warn('Player sync error:', err);
          // Continue with other players
        }
      }

      // 3. Sync Matches
      const matches = storage.get('matches', []);
      for (const match of matches) {
        try {
          await api.matches.create(match);
        } catch (err) {
          console.warn('Match sync error:', err);
        }
      }

      // 4. Sync Training Sessions
      const trainingSessions = storage.get('trainingSessions', []);
      for (const session of trainingSessions) {
        try {
          await api.training.create(session);
        } catch (err) {
          console.warn('Training session sync error:', err);
        }
      }

      // 5. Sync Achievements
      const achievements = (storage as any).getAll();
      for (const [key, value] of Object.entries(achievements)) {
        if (key.startsWith('achievements_')) {
          const playerId = key.replace('achievements_', '');
          try {
            await api.achievements.update(playerId, value);
          } catch (err) {
            console.warn('Achievements sync error:', err);
          }
        }
      }

      this.lastSync = Date.now();
      console.log('Initial sync completed successfully');
    } catch (err: any) {
      console.error('Initial sync failed:', err);
      this.error = err.message || 'Sync failed';
      throw err;
    } finally {
      this.syncing = false;
      this.notify();
    }
  }

  /**
   * Sync specific data type to server
   */
  async syncData(type: 'player' | 'match' | 'training' | 'achievement', data: any): Promise<void> {
    try {
      switch (type) {
        case 'player':
          await api.players.update(data.id, data);
          break;
        case 'match':
          await api.matches.update(data.id, data);
          break;
        case 'training':
          await api.training.update(data.id, data);
          break;
        case 'achievement':
          await api.achievements.update(data.playerId, data.achievements);
          break;
      }
    } catch (err) {
      console.error(`Sync ${type} failed:`, err);
      throw err;
    }
  }

  /**
   * Pull data from server and merge with local
   */
  async pullData(storage: TenantStorage): Promise<void> {
    if (this.syncing) {
      console.log('Sync already in progress');
      return;
    }

    this.syncing = true;
    this.error = null;
    this.notify();

    try {
      // 1. Pull Tenants
      const tenants = await api.tenants.getAll();
      storage.set('tenants', tenants);

      // 2. Pull Players
      const players = await api.players.getAll();
      storage.set('players', players);

      // 3. Pull Matches
      const matches = await api.matches.getAll();
      storage.set('matches', matches);

      // 4. Pull Training Sessions
      const trainingSessions = await api.training.getAll();
      storage.set('trainingSessions', trainingSessions);

      // 5. Pull Achievements
      for (const player of players) {
        const achievements = await api.achievements.getByPlayer(player.id);
        storage.set(`achievements_${player.id}`, achievements);
      }

      this.lastSync = Date.now();
      console.log('Pull data completed successfully');
    } catch (err: any) {
      console.error('Pull data failed:', err);
      this.error = err.message || 'Pull failed';
      throw err;
    } finally {
      this.syncing = false;
      this.notify();
    }
  }

  /**
   * Full sync: Push local changes, then pull server data
   */
  async fullSync(storage: TenantStorage, tenantId: string): Promise<void> {
    await this.initialSync(storage, tenantId);
    await this.pullData(storage);
  }
}

export const syncService = new SyncService();
export default syncService;
