import { describe, it, expect, beforeEach } from 'vitest';
import { TenantStorage } from '../../utils/storage';

describe('TenantStorage', () => {
  let storage: TenantStorage;
  const tenantId = 'test-tenant-123';

  beforeEach(() => {
    localStorage.clear();
    storage = new TenantStorage(tenantId);
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      storage.set('testKey', 'testValue');
      expect(storage.get('testKey', null)).toBe('testValue');
    });

    it('should return default value if key does not exist', () => {
      expect(storage.get('nonexistent', 'default')).toBe('default');
    });

    it('should store and retrieve objects', () => {
      const obj = { name: 'Test', score: 100 };
      storage.set('testObj', obj);
      expect(storage.get('testObj', null)).toEqual(obj);
    });

    it('should store and retrieve arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      storage.set('testArr', arr);
      expect(storage.get('testArr', null)).toEqual(arr);
    });
  });

  describe('remove', () => {
    it('should remove a key', () => {
      storage.set('testKey', 'testValue');
      storage.remove('testKey');
      expect(storage.get('testKey', null)).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all tenant data', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.clear();
      expect(storage.get('key1', null)).toBeNull();
      expect(storage.get('key2', null)).toBeNull();
    });

    it('should not affect other tenants data', () => {
      const otherStorage = new TenantStorage('other-tenant');
      storage.set('key1', 'value1');
      otherStorage.set('key1', 'otherValue');
      
      storage.clear();
      
      expect(storage.get('key1', null)).toBeNull();
      expect(otherStorage.get('key1', null)).toBe('otherValue');
    });
  });

  describe('tenant isolation', () => {
    it('should isolate data between different tenants', () => {
      const tenant1 = new TenantStorage('tenant-1');
      const tenant2 = new TenantStorage('tenant-2');
      
      tenant1.set('sharedKey', 'value1');
      tenant2.set('sharedKey', 'value2');
      
      expect(tenant1.get('sharedKey', null)).toBe('value1');
      expect(tenant2.get('sharedKey', null)).toBe('value2');
    });
  });
});
