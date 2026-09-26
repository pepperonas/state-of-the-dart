import { describe, it, expect, beforeEach } from 'vitest';
import {
  TenantStorage, accountScope, claimDefaultCache, clearDeviceGameState, DEVICE_GAME_KEYS,
} from '../../utils/storage';

beforeEach(() => localStorage.clear());

describe('per-account cache', () => {
  it('two accounts on one device do not see each other\'s cache', () => {
    new TenantStorage(accountScope('alice')).set('personalBests', { a: 1 });
    expect(new TenantStorage(accountScope('bob')).get('personalBests', null)).toBeNull();
  });

  it('the first account after the switch inherits the old shared cache, including pending unlocks', () => {
    localStorage.setItem('tenant_default_achievements_pending_sync', JSON.stringify([{ achievementId: 'first_180' }]));
    claimDefaultCache('alice');
    expect(new TenantStorage(accountScope('alice')).get('achievements_pending_sync', [])).toHaveLength(1);
    expect(localStorage.getItem('tenant_default_achievements_pending_sync')).toBeNull();
  });

  it('the migration runs once — a later account starts empty', () => {
    localStorage.setItem('tenant_default_lastPlayerIds', '["x"]');
    claimDefaultCache('alice');
    localStorage.setItem('tenant_default_lastPlayerIds', '["y"]'); // stale write from old code
    claimDefaultCache('bob');
    expect(new TenantStorage(accountScope('bob')).get('lastPlayerIds', null)).toBeNull();
  });

  it('does not overwrite data the account already has', () => {
    localStorage.setItem(`tenant_${accountScope('alice')}_lastPlayerIds`, '["mine"]');
    localStorage.setItem('tenant_default_lastPlayerIds', '["old"]');
    claimDefaultCache('alice');
    expect(new TenantStorage(accountScope('alice')).get('lastPlayerIds', [])).toEqual(['mine']);
  });
});

describe('clearDeviceGameState', () => {
  it('removes every running game save and nothing else', () => {
    DEVICE_GAME_KEYS.forEach(k => localStorage.setItem(k, '{}'));
    localStorage.setItem('auth_token', 't');
    clearDeviceGameState();
    DEVICE_GAME_KEYS.forEach(k => expect(localStorage.getItem(k)).toBeNull());
    expect(localStorage.getItem('auth_token')).toBe('t');
  });
});
