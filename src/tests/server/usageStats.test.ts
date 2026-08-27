import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import {
  collectUsageByUser, ACTIVITY_DAYS, DAY_MS,
} from '../../../server/src/services/usageStats';

/**
 * Runs the real SQL against a real in-memory SQLite, not a hand-written fake.
 * The value of this function is entirely in the joins and the day bucketing —
 * a stubbed `db` would test the stub.
 */
const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BetterSqlite3 = require_('../../../server/node_modules/better-sqlite3') as any;

const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const day = (n: number) => NOW - n * DAY_MS;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

const addUser = (id: string) => {
  db.prepare('INSERT INTO users (id) VALUES (?)').run(id);
  db.prepare('INSERT INTO tenants (id, user_id) VALUES (?, ?)').run(`${id}-t`, id);
  return `${id}-t`;
};
const addMatch = (tenantId: string, startedAt: number) =>
  db.prepare('INSERT INTO matches (id, tenant_id, started_at) VALUES (?, ?, ?)')
    .run(`m${Math.random()}`, tenantId, startedAt);
const addTraining = (tenantId: string, startedAt: number) =>
  db.prepare('INSERT INTO training_sessions (id, tenant_id, started_at) VALUES (?, ?, ?)')
    .run(`s${Math.random()}`, tenantId, startedAt);

beforeEach(() => {
  db = new BetterSqlite3(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY);
    CREATE TABLE tenants (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE matches (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, started_at INTEGER NOT NULL);
    CREATE TABLE training_sessions (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, started_at INTEGER NOT NULL);
  `);
});

describe('collectUsageByUser', () => {
  it('is empty when nobody has played', () => {
    addUser('u1');
    expect(collectUsageByUser(db, NOW).size).toBe(0);
  });

  it('counts matches through the tenant that owns them', () => {
    const t = addUser('u1');
    addMatch(t, day(1));
    addMatch(t, day(2));
    const usage = collectUsageByUser(db, NOW).get('u1')!;
    expect(usage.matches).toBe(2);
    expect(usage.trainings).toBe(0);
  });

  /** Someone who only ever trains is still using the app. */
  it('counts training sessions too', () => {
    const t = addUser('u1');
    addTraining(t, day(1));
    const usage = collectUsageByUser(db, NOW).get('u1')!;
    expect(usage.trainings).toBe(1);
    expect(usage.activity.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('keeps users apart', () => {
    const a = addUser('u1'), b = addUser('u2');
    addMatch(a, day(1));
    addMatch(b, day(1));
    addMatch(b, day(2));
    const usage = collectUsageByUser(db, NOW);
    expect(usage.get('u1')!.matches).toBe(1);
    expect(usage.get('u2')!.matches).toBe(2);
  });

  /** One account can hold several profiles; all of them are that user's usage. */
  it('sums across every tenant a user owns', () => {
    addUser('u1');
    db.prepare('INSERT INTO tenants (id, user_id) VALUES (?, ?)').run('u1-t2', 'u1');
    addMatch('u1-t', day(1));
    addMatch('u1-t2', day(1));
    expect(collectUsageByUser(db, NOW).get('u1')!.matches).toBe(2);
  });

  describe('the activity window', () => {
    it('is exactly ACTIVITY_DAYS long', () => {
      const t = addUser('u1');
      addMatch(t, day(1));
      expect(collectUsageByUser(db, NOW).get('u1')!.activity).toHaveLength(ACTIVITY_DAYS);
    });

    it('puts today LAST, so the chart reads left to right in time', () => {
      const t = addUser('u1');
      addMatch(t, day(0)); // today only
      const { activity } = collectUsageByUser(db, NOW).get('u1')!;
      expect(activity[ACTIVITY_DAYS - 1]).toBe(1);
      expect(activity[0]).toBe(0);
    });

    it('puts the far edge of the window FIRST', () => {
      const t = addUser('u1');
      addMatch(t, day(ACTIVITY_DAYS - 1)); // oldest day still in range
      const { activity } = collectUsageByUser(db, NOW).get('u1')!;
      expect(activity[0]).toBe(1);
      expect(activity[ACTIVITY_DAYS - 1]).toBe(0);
    });

    it('places a mid-window day at the matching offset', () => {
      const t = addUser('u1');
      addMatch(t, day(10));
      const { activity } = collectUsageByUser(db, NOW).get('u1')!;
      expect(activity[ACTIVITY_DAYS - 1 - 10]).toBe(1);
      expect(activity.filter((n) => n > 0)).toHaveLength(1);
    });

    it('buckets several games on one day together', () => {
      const t = addUser('u1');
      for (let i = 0; i < 4; i++) addMatch(t, day(3) + i * 1000);
      const { activity } = collectUsageByUser(db, NOW).get('u1')!;
      expect(Math.max(...activity)).toBe(4);
      expect(activity.filter((n) => n > 0)).toHaveLength(1);
    });

    it('adds matches and trainings into the same day bucket', () => {
      const t = addUser('u1');
      addMatch(t, day(2));
      addTraining(t, day(2));
      const { activity } = collectUsageByUser(db, NOW).get('u1')!;
      expect(Math.max(...activity)).toBe(2);
    });

    /** Old games still count towards the totals, just not the chart. */
    it('excludes games older than the window from the chart but not the total', () => {
      const t = addUser('u1');
      addMatch(t, day(ACTIVITY_DAYS + 10));
      const usage = collectUsageByUser(db, NOW).get('u1')!;
      expect(usage.matches).toBe(1);
      expect(usage.activity.reduce((a, b) => a + b, 0)).toBe(0);
    });

    /**
     * `/api/admin/fix-timestamps` exists because rows with a zero timestamp are
     * real. They must not land in bucket 0 of 1970 or skew the window.
     */
    it('keeps a zero-timestamp row out of the chart', () => {
      const t = addUser('u1');
      addMatch(t, 0);
      addMatch(t, day(1));
      const usage = collectUsageByUser(db, NOW).get('u1')!;
      expect(usage.activity.reduce((a, b) => a + b, 0)).toBe(1);
    });

    /**
     * …but it still happened, so it counts towards the all-time total. Recorded
     * because the two queries deliberately differ: the chart is windowed, the
     * total is not.
     */
    it('still counts a zero-timestamp row in the all-time total', () => {
      const t = addUser('u1');
      addMatch(t, 0);
      addMatch(t, day(1));
      expect(collectUsageByUser(db, NOW).get('u1')!.matches).toBe(2);
    });

    it('never writes outside the array, whatever the timestamp', () => {
      const t = addUser('u1');
      addMatch(t, NOW + 10 * DAY_MS);   // a future row (clock skew)
      addMatch(t, 1);                   // 1970
      const usage = collectUsageByUser(db, NOW).get('u1');
      const activity = usage?.activity ?? [];
      expect(activity.length === 0 || activity.length === ACTIVITY_DAYS).toBe(true);
      expect(activity.every((n) => Number.isFinite(n) && n >= 0)).toBe(true);
    });
  });

  /**
   * The endpoint renders a table that grows with the user base. The query count
   * must not grow with it — this is the N+1 guard.
   */
  it('runs a fixed number of queries regardless of user count', () => {
    const count = (users: number) => {
      db = new BetterSqlite3(':memory:');
      db.exec(`
        CREATE TABLE users (id TEXT PRIMARY KEY);
        CREATE TABLE tenants (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
        CREATE TABLE matches (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, started_at INTEGER NOT NULL);
        CREATE TABLE training_sessions (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, started_at INTEGER NOT NULL);
      `);
      for (let i = 0; i < users; i++) {
        const t = addUser(`u${i}`);
        addMatch(t, day(1));
      }
      let prepared = 0;
      const realPrepare = db.prepare.bind(db);
      db.prepare = (sql: string) => { prepared++; return realPrepare(sql); };
      collectUsageByUser(db, NOW);
      return prepared;
    };
    expect(count(2)).toBe(count(40));
  });
});
