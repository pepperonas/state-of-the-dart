import { describe, it, expect } from 'vitest';
import {
  MASTER_ADMIN_EMAIL,
  isMasterAdmin,
  adminFlagFor,
  syncAdminFlag,
} from '../../../server/src/config/adminAllowlist';

/** Minimal better-sqlite3 stand-in: records what would have been written. */
const fakeDb = (stored: Record<string, number>) => {
  const writes: Array<[number, string]> = [];
  return {
    writes,
    stored,
    prepare(sql: string) {
      return {
        get: (...a: unknown[]) => {
          const id = a[0] as string;
          return id in stored ? { is_admin: stored[id] } : undefined;
        },
        run: (...a: unknown[]) => {
          const [flag, id] = a as [number, string];
          if (!/UPDATE users SET is_admin/.test(sql)) throw new Error('unexpected sql: ' + sql);
          stored[id] = flag;
          writes.push([flag, id]);
        },
      };
    },
  };
};

describe('admin allowlist — exactly one account', () => {
  it('recognises only the master address', () => {
    expect(isMasterAdmin(MASTER_ADMIN_EMAIL)).toBe(true);
    expect(isMasterAdmin('martin.pfeffer@celox.io')).toBe(false); // was a second admin before
    expect(isMasterAdmin('someone@else.com')).toBe(false);
    expect(isMasterAdmin(null)).toBe(false);
    expect(isMasterAdmin(undefined)).toBe(false);
    expect(isMasterAdmin('')).toBe(false);
  });

  it('is not fooled by case or padding', () => {
    expect(isMasterAdmin('  MartinPaush@Gmail.COM  ')).toBe(true);
  });

  it('does not match a lookalike address', () => {
    expect(isMasterAdmin('martinpaush@gmail.com.evil.tld')).toBe(false);
    expect(isMasterAdmin('xmartinpaush@gmail.com')).toBe(false);
    expect(isMasterAdmin('martinpaush@gmail.co')).toBe(false);
  });

  it('derives the stored flag from the address', () => {
    expect(adminFlagFor(MASTER_ADMIN_EMAIL)).toBe(1);
    expect(adminFlagFor('someone@else.com')).toBe(0);
  });

  it('grants the flag to the master account when it is missing', () => {
    const db = fakeDb({ u1: 0 });
    expect(syncAdminFlag(db, 'u1', MASTER_ADMIN_EMAIL)).toBe(1);
    expect(db.stored.u1).toBe(1);
  });

  it('REVOKES a stale flag from anyone else', () => {
    // The case that matters: promoted back when make-admin still existed.
    const db = fakeDb({ u2: 1 });
    expect(syncAdminFlag(db, 'u2', 'someone@else.com')).toBe(0);
    expect(db.stored.u2).toBe(0);
  });

  it('writes nothing when the stored flag already agrees', () => {
    const db = fakeDb({ u1: 1, u2: 0 });
    syncAdminFlag(db, 'u1', MASTER_ADMIN_EMAIL);
    syncAdminFlag(db, 'u2', 'someone@else.com');
    expect(db.writes).toEqual([]);
  });
});
