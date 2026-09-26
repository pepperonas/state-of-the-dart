import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { schema } from '../../../server/src/database/schema';
import { toEpochMs, upsertMatch, updateMatch } from '../../../server/src/services/matchStore';

/** The real schema on a real in-memory SQLite — the value is all in the SQL. */
const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BetterSqlite3 = require_('../../../server/node_modules/better-sqlite3') as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

const T0 = Date.UTC(2026, 8, 1, 20, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

/** A finished 1-leg match exactly as the frontend serialises it. */
const finishedMatch = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  gameType: 'x01',
  status: 'completed',
  settings: { startScore: 501, legsToWin: 1 },
  startedAt: T0,
  completedAt: T0 + 600_000,
  winner: 'alice',
  players: [
    { playerId: 'alice', matchAverage: 83.5, matchHighestScore: 180, legsWon: 1, match180s: 1, dartsThrown: 18 },
    { playerId: 'bob', matchAverage: 61.2, matchHighestScore: 100, legsWon: 0, dartsThrown: 15 },
  ],
  legs: [{
    id: 'l1',
    winner: 'alice',
    startedAt: iso(T0),
    completedAt: iso(T0 + 590_000),
    throws: [
      { id: 't1', playerId: 'alice', darts: [], score: 180, remaining: 321, timestamp: iso(T0 + 10_000), visitNumber: 1 },
      { id: 't2', playerId: 'alice', darts: [], score: 40, remaining: 0, timestamp: iso(T0 + 580_000), visitNumber: 2, isCheckoutAttempt: true },
    ],
  }],
  ...over,
});

const matchRow = () => db.prepare('SELECT * FROM matches WHERE id = ?').get('m1');

beforeEach(() => {
  db = new BetterSqlite3(':memory:');
  db.exec(schema);
  // Foreign keys are enforced, as in production: seed the owners.
  db.prepare("INSERT INTO users (id, email, name, created_at, last_active) VALUES ('u', 'u@x', 'U', 0, 0)").run();
  for (const t of ['tenant', 'other-tenant', 'intruder']) {
    db.prepare('INSERT INTO tenants (id, user_id, name, created_at, last_active) VALUES (?, ?, ?, 0, 0)').run(t, 'u', t);
  }
  for (const p of ['alice', 'bob']) {
    db.prepare('INSERT INTO players (id, tenant_id, name, created_at) VALUES (?, ?, ?, 0)').run(p, 'tenant', p);
  }
});

describe('toEpochMs', () => {
  it('accepts ISO strings, epoch ms, epoch seconds and Dates', () => {
    expect(toEpochMs(iso(T0))).toBe(T0);
    expect(toEpochMs(T0)).toBe(T0);
    expect(toEpochMs(T0 / 1000)).toBe(T0);
    expect(toEpochMs(new Date(T0))).toBe(T0);
  });

  it('returns null for nothing and for garbage', () => {
    expect(toEpochMs(undefined)).toBeNull();
    expect(toEpochMs(null)).toBeNull();
    expect(toEpochMs('')).toBeNull();
    expect(toEpochMs('not a date')).toBeNull();
  });
});

describe('upsertMatch — the final save of a finished match', () => {
  it('stores winner and completion time on first save', () => {
    expect(upsertMatch(db, 'tenant', finishedMatch())).toBe('created');
    expect(matchRow()).toMatchObject({ winner: 'alice', completed_at: T0 + 600_000, status: 'completed' });
  });

  it('stores winner and completion time when the match already exists (the case that lost them)', () => {
    upsertMatch(db, 'tenant', finishedMatch({ status: 'in-progress', winner: undefined, completedAt: undefined, legs: [] }));
    expect(matchRow().winner).toBeNull();

    expect(upsertMatch(db, 'tenant', finishedMatch())).toBe('updated');
    expect(matchRow()).toMatchObject({ winner: 'alice', completed_at: T0 + 600_000, status: 'completed' });
  });

  it('writes the legs and throws, including the checkout', () => {
    upsertMatch(db, 'tenant', finishedMatch());
    const leg = db.prepare('SELECT * FROM legs WHERE id = ?').get('l1');
    expect(leg).toMatchObject({ match_id: 'm1', winner: 'alice', leg_number: 1 });
    const throws = db.prepare('SELECT * FROM throws WHERE leg_id = ? ORDER BY visit_number').all('l1');
    expect(throws.map((t: { score: number }) => t.score)).toEqual([180, 40]);
  });

  it('stores timestamps as integers, not ISO strings', () => {
    upsertMatch(db, 'tenant', finishedMatch());
    const leg = db.prepare('SELECT started_at, completed_at FROM legs WHERE id = ?').get('l1');
    expect(leg).toEqual({ started_at: T0, completed_at: T0 + 590_000 });
    const t = db.prepare('SELECT timestamp FROM throws WHERE id = ?').get('t1');
    expect(t.timestamp).toBe(T0 + 10_000);
  });

  it('reads the highest score from matchHighestScore, as the frontend sends it', () => {
    upsertMatch(db, 'tenant', finishedMatch());
    const alice = db.prepare('SELECT * FROM match_players WHERE player_id = ?').get('alice');
    expect(alice.highest_score).toBe(180);
    expect(alice.darts_thrown).toBe(18);
  });

  it('never overwrites another tenant\'s match with the same id', () => {
    upsertMatch(db, 'other-tenant', finishedMatch({ winner: 'bob' }));
    // Match ids are globally unique: the second tenant's insert is refused,
    // it does not fall through to "update" someone else's row.
    expect(() => upsertMatch(db, 'tenant', finishedMatch())).toThrow();
    expect(matchRow()).toMatchObject({ tenant_id: 'other-tenant', winner: 'bob' });
  });

  it('drops legs the client no longer has', () => {
    upsertMatch(db, 'tenant', finishedMatch({
      legs: [...finishedMatch().legs, { id: 'l2', startedAt: T0 + 600_000, throws: [] }],
    }));
    expect(db.prepare('SELECT COUNT(*) AS n FROM legs WHERE match_id = ?').get('m1').n).toBe(2);
    upsertMatch(db, 'tenant', finishedMatch());
    expect(db.prepare('SELECT COUNT(*) AS n FROM legs WHERE match_id = ?').get('m1').n).toBe(1);
  });
});

describe('updateMatch', () => {
  it('can clear winner and completed_at — needed to undo the end of a match', () => {
    upsertMatch(db, 'tenant', finishedMatch());
    expect(updateMatch(db, 'tenant', 'm1', { status: 'in-progress', winner: null, completedAt: null })).toBe(true);
    expect(matchRow()).toMatchObject({ winner: null, completed_at: null, status: 'in-progress' });
  });

  it('leaves fields alone that are not in the body', () => {
    upsertMatch(db, 'tenant', finishedMatch());
    updateMatch(db, 'tenant', 'm1', { status: 'completed' });
    expect(matchRow()).toMatchObject({ winner: 'alice', completed_at: T0 + 600_000 });
  });

  it('refuses a match of another tenant', () => {
    upsertMatch(db, 'tenant', finishedMatch());
    expect(updateMatch(db, 'intruder', 'm1', { winner: null })).toBe(false);
    expect(matchRow().winner).toBe('alice');
  });

  it('refuses to overwrite a leg that belongs to a different match', () => {
    upsertMatch(db, 'tenant', finishedMatch());
    upsertMatch(db, 'tenant', finishedMatch({ id: 'm2', legs: [] }));
    updateMatch(db, 'tenant', 'm2', { legs: [{ id: 'l1', winner: 'bob', startedAt: T0, throws: [] }] });
    expect(db.prepare('SELECT match_id, winner FROM legs WHERE id = ?').get('l1')).toEqual({ match_id: 'm1', winner: 'alice' });
  });
});
