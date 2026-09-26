import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { schema } from '../../../server/src/database/schema';
import {
  saveTournament, listTournaments, getTournament, deleteTournament, validateTournament,
} from '../../../server/src/services/tournamentStore';

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BetterSqlite3 = require_('../../../server/node_modules/better-sqlite3') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

const T0 = Date.UTC(2026, 8, 26, 20, 0, 0);

/** A tournament exactly as the frontend serialises it (dates as ISO strings). */
const tournament = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  name: 'Freitagsturnier',
  type: 'knockout',
  status: 'in-progress',
  currentRound: 1,
  createdAt: new Date(T0).toISOString(),
  startedAt: new Date(T0).toISOString(),
  participants: [
    { id: 'pa', playerId: 'alice', seed: 1, wins: 0, losses: 0, legsFor: 0, legsAgainst: 0 },
    { id: 'pb', playerId: 'bob', seed: 2, wins: 0, losses: 0, legsFor: 0, legsAgainst: 0 },
  ],
  matches: [{ id: 'm1', round: 1, participant1Id: 'pa', participant2Id: 'pb' }],
  settings: { gameType: 'x01', matchSettings: { startScore: 501, legsToWin: 3, doubleOut: true }, bestOf: 5 },
  scores: { m1: { p1: 2, p2: 1 } },
  ...over,
});

beforeEach(() => {
  db = new BetterSqlite3(':memory:');
  db.exec(schema);
  db.prepare("INSERT INTO users (id, email, name, created_at, last_active) VALUES ('u', 'u@x', 'U', 0, 0)").run();
  for (const t of ['tenant', 'intruder']) {
    db.prepare('INSERT INTO tenants (id, user_id, name, created_at, last_active) VALUES (?, ?, ?, 0, 0)').run(t, 'u', t);
  }
});

describe('tournamentStore', () => {
  it('saves and reads back a tournament, including half-entered scores', () => {
    expect(saveTournament(db, 'tenant', tournament())).toBe('created');
    const back = getTournament(db, 'tenant', 't1')!;
    expect(back.name).toBe('Freitagsturnier');
    expect(back.matches).toHaveLength(1);
    expect(back.participants).toHaveLength(2);
    expect(back.scores).toEqual({ m1: { p1: 2, p2: 1 } });
    expect(back.createdAt).toBe(new Date(T0).toISOString());
  });

  it('updates on the next save and records completion', () => {
    saveTournament(db, 'tenant', tournament());
    const done = new Date(T0 + 3_600_000).toISOString();
    expect(saveTournament(db, 'tenant', tournament({
      status: 'completed', completedAt: done,
      matches: [{ id: 'm1', round: 1, participant1Id: 'pa', participant2Id: 'pb', winner: 'pa' }],
    }))).toBe('updated');
    const row = db.prepare('SELECT status, completed_at FROM tournaments WHERE id = ?').get('t1');
    expect(row).toEqual({ status: 'completed', completed_at: T0 + 3_600_000 });
    expect(getTournament(db, 'tenant', 't1')!.matches[0].winner).toBe('pa');
  });

  it('lists a tenant\'s tournaments, most recently changed first', () => {
    saveTournament(db, 'tenant', tournament({ id: 'old' }));
    db.prepare('UPDATE tournaments SET updated_at = 1 WHERE id = ?').run('old');
    saveTournament(db, 'tenant', tournament({ id: 'new' }));
    expect(listTournaments(db, "tenant").map((t: { id: string }) => t.id)).toEqual(['new', 'old']);
  });

  it('keeps tenants apart: no reading, overwriting or deleting another tenant\'s tournament', () => {
    saveTournament(db, 'tenant', tournament());
    expect(getTournament(db, 'intruder', 't1')).toBeNull();
    expect(listTournaments(db, 'intruder')).toEqual([]);
    expect(saveTournament(db, 'intruder', tournament({ name: 'gekapert' }))).toBe('forbidden');
    expect(getTournament(db, 'tenant', 't1')!.name).toBe('Freitagsturnier');
    expect(deleteTournament(db, 'intruder', 't1')).toBe(false);
    expect(deleteTournament(db, 'tenant', 't1')).toBe(true);
    expect(getTournament(db, 'tenant', 't1')).toBeNull();
  });

  it('is removed with its tenant', () => {
    saveTournament(db, 'tenant', tournament());
    db.pragma('foreign_keys = ON');
    db.prepare('DELETE FROM tenants WHERE id = ?').run('tenant');
    expect(db.prepare('SELECT count(*) AS n FROM tournaments').get().n).toBe(0);
  });

  it('rejects malformed input', () => {
    expect(validateTournament(tournament())).toBeNull();
    expect(validateTournament(tournament({ id: '' }))).toMatch(/id/);
    expect(validateTournament(tournament({ name: '' }))).toMatch(/name/);
    expect(validateTournament(tournament({ name: 'x'.repeat(101) }))).toMatch(/name/);
    expect(validateTournament(tournament({ type: 'swiss-cheese' }))).toMatch(/type/);
    expect(validateTournament(tournament({ status: 'paused' }))).toMatch(/status/);
    expect(validateTournament(tournament({ participants: 'x' }))).toMatch(/participants/);
    expect(validateTournament(tournament({ participants: new Array(33).fill({}) }))).toMatch(/participants/);
    expect(validateTournament(tournament({ matches: new Array(1000).fill({}) }))).toMatch(/matches/);
    expect(validateTournament(null)).toMatch(/body/);
  });
});
