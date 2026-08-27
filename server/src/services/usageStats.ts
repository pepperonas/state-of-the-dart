import type { Database } from 'better-sqlite3';

/** Days of history the activity sparkline covers. */
export const ACTIVITY_DAYS = 30;
export const DAY_MS = 86_400_000;

export interface UserUsage {
  matches: number;
  trainings: number;
  /** One count per day, oldest first. */
  activity: number[];
}

/**
 * Per-user usage, for the admin table only.
 *
 * A user does not own matches directly — they own tenants, and tenants own the
 * matches and training sessions. Both are counted: someone who only ever trains
 * is still using the app.
 *
 * ⚠️ Two grouped queries, not one per user. With four accounts the difference is
 * invisible, but this endpoint renders a table that grows with the user base and
 * an N+1 here would be a slow fuse.
 *
 * Buckets are whole UTC days (`started_at / DAY_MS`). Good enough for a
 * sparkline, and it avoids a per-row timezone conversion in SQLite.
 */
export function collectUsageByUser(db: Database, now: number): Map<string, UserUsage> {
  const since = (Math.floor(now / DAY_MS) - (ACTIVITY_DAYS - 1)) * DAY_MS;

  type Row = { userId: string; day: number; n: number };
  // `started_at > 0` filters the rows the `/fix-timestamps` route exists to repair.
  const daily = (table: string): Row[] =>
    db.prepare(`
      SELECT t.user_id AS userId,
             CAST(s.started_at / ${DAY_MS} AS INTEGER) AS day,
             COUNT(*) AS n
      FROM ${table} s
      JOIN tenants t ON t.id = s.tenant_id
      WHERE s.started_at > 0 AND s.started_at >= ?
      GROUP BY t.user_id, day
    `).all(since) as Row[];

  type Total = { userId: string; n: number };
  const totals = (table: string): Total[] =>
    db.prepare(`
      SELECT t.user_id AS userId, COUNT(*) AS n
      FROM ${table} s
      JOIN tenants t ON t.id = s.tenant_id
      GROUP BY t.user_id
    `).all() as Total[];

  const today = Math.floor(now / DAY_MS);
  const usage = new Map<string, UserUsage>();
  const slot = (userId: string) => {
    let u = usage.get(userId);
    if (!u) {
      u = { matches: 0, trainings: 0, activity: new Array(ACTIVITY_DAYS).fill(0) };
      usage.set(userId, u);
    }
    return u;
  };

  for (const r of daily('matches')) {
    const i = ACTIVITY_DAYS - 1 - (today - r.day);
    if (i >= 0 && i < ACTIVITY_DAYS) slot(r.userId).activity[i] += r.n;
  }
  for (const r of daily('training_sessions')) {
    const i = ACTIVITY_DAYS - 1 - (today - r.day);
    if (i >= 0 && i < ACTIVITY_DAYS) slot(r.userId).activity[i] += r.n;
  }
  for (const r of totals('matches')) slot(r.userId).matches = r.n;
  for (const r of totals('training_sessions')) slot(r.userId).trainings = r.n;

  return usage;
}

