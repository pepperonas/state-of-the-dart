import { toEpochMs } from './matchStore';

/**
 * Tournament persistence. Until 0.16.0 tournaments lived only in React state:
 * a reload, a closed tab or a phone going to sleep lost the whole bracket.
 *
 * One row per tournament; the bracket, standings and half-entered scores are a
 * JSON document because they are always read and written together. The row's
 * own columns carry what a list needs (name, type, status, times).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const TYPES = ['knockout', 'round-robin'];
const STATUSES = ['setup', 'in-progress', 'completed'];
const MAX_PARTICIPANTS = 32;
const MAX_MATCHES = 600; // round robin of 32 = 496
const MAX_BYTES = 256_000;

/** null when valid, otherwise what is wrong. */
export const validateTournament = (body: Json): string | null => {
  if (!body || typeof body !== 'object') return 'body must be an object';
  if (typeof body.id !== 'string' || body.id.length === 0 || body.id.length > 64) return 'id is required (1-64 chars)';
  if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 100) return 'name is required (1-100 chars)';
  if (!TYPES.includes(body.type)) return `type must be one of ${TYPES.join(', ')}`;
  if (!STATUSES.includes(body.status)) return `status must be one of ${STATUSES.join(', ')}`;
  if (!Array.isArray(body.participants) || body.participants.length > MAX_PARTICIPANTS) return `participants must be an array of at most ${MAX_PARTICIPANTS}`;
  if (!Array.isArray(body.matches) || body.matches.length > MAX_MATCHES) return `matches must be an array of at most ${MAX_MATCHES}`;
  if (JSON.stringify(body).length > MAX_BYTES) return 'tournament too large';
  return null;
};

const DATA_KEYS = ['participants', 'matches', 'settings', 'currentRound', 'scores', 'createdAt', 'startedAt', 'completedAt'];

const toRow = (body: Json) => {
  const data: Json = {};
  for (const k of DATA_KEYS) if (body[k] !== undefined) data[k] = body[k];
  return {
    name: body.name.trim(),
    type: body.type,
    status: body.status,
    data: JSON.stringify(data),
    created_at: toEpochMs(body.createdAt) ?? Date.now(),
    completed_at: body.status === 'completed' ? (toEpochMs(body.completedAt) ?? Date.now()) : null,
  };
};

const fromRow = (row: Json) => ({
  ...JSON.parse(row.data),
  id: row.id,
  name: row.name,
  type: row.type,
  status: row.status,
  updatedAt: row.updated_at,
});

/**
 * Create or replace. 'forbidden' if the id already belongs to another tenant —
 * an id is not a password, and guessing one must not overwrite someone's bracket.
 */
export const saveTournament = (db: Db, tenantId: string, body: Json): 'created' | 'updated' | 'forbidden' => {
  const existing = db.prepare('SELECT tenant_id FROM tournaments WHERE id = ?').get(body.id);
  if (existing && existing.tenant_id !== tenantId) return 'forbidden';
  const r = toRow(body);
  const now = Date.now();
  if (existing) {
    db.prepare(
      'UPDATE tournaments SET name = ?, type = ?, status = ?, data = ?, updated_at = ?, completed_at = ? WHERE id = ? AND tenant_id = ?',
    ).run(r.name, r.type, r.status, r.data, now, r.completed_at, body.id, tenantId);
    return 'updated';
  }
  db.prepare(
    'INSERT INTO tournaments (id, tenant_id, name, type, status, data, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(body.id, tenantId, r.name, r.type, r.status, r.data, r.created_at, now, r.completed_at);
  return 'created';
};

export const listTournaments = (db: Db, tenantId: string, limit = 50) =>
  db.prepare('SELECT * FROM tournaments WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT ?').all(tenantId, limit).map(fromRow);

export const getTournament = (db: Db, tenantId: string, id: string) => {
  const row = db.prepare('SELECT * FROM tournaments WHERE id = ? AND tenant_id = ?').get(id, tenantId);
  return row ? fromRow(row) : null;
};

export const deleteTournament = (db: Db, tenantId: string, id: string): boolean =>
  db.prepare('DELETE FROM tournaments WHERE id = ? AND tenant_id = ?').run(id, tenantId).changes > 0;
