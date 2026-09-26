/**
 * Writes matches, their players, legs and throws.
 *
 * Lives outside the route so it can run against a real in-memory SQLite in the
 * tests. Before this module the upsert branch of POST /api/matches only wrote
 * game_type/status/settings: every completed match landed in the database
 * without winner, completed_at or its final leg, and every "won matches"
 * achievement query (`m.winner = ?`) counted zero.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

/**
 * Timestamps arrive as epoch ms, epoch seconds, ISO strings or Date JSON.
 * The columns are INTEGER; ISO strings used to be stored verbatim.
 */
export const toEpochMs = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (value.trim() !== '' && Number.isFinite(asNumber)) return toEpochMs(asNumber);
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
};

/** The client calls it matchHighestScore, older clients highestScore. */
const highestScoreOf = (player: Json): number =>
  player.highestScore ?? player.matchHighestScore ?? 0;

const insertPlayers = (db: Db, matchId: string, players: Json[]) => {
  const insertPlayer = db.prepare(`
    INSERT INTO match_players (
      id, match_id, player_id, match_average, first9_average,
      highest_score, checkouts_hit, checkout_attempts,
      match_180s, match_171_plus, match_140_plus, match_100_plus, match_60_plus,
      darts_thrown, legs_won, sets_won
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const player of players) {
    insertPlayer.run(
      player.id || `${matchId}-${player.playerId}`,
      matchId,
      player.playerId,
      player.matchAverage || 0,
      player.first9Average || 0,
      highestScoreOf(player),
      player.checkoutsHit || 0,
      player.checkoutAttempts || 0,
      player.match180s || 0,
      player.match171Plus || 0,
      player.match140Plus || 0,
      player.match100Plus || 0,
      player.match60Plus || 0,
      player.dartsThrown || 0,
      player.legsWon || 0,
      player.setsWon || 0,
    );
  }
};

const writeThrow = (db: Db, legId: string, throwData: Json, fallbackTs: number) => {
  db.prepare(`
    INSERT OR REPLACE INTO throws (
      id, leg_id, player_id, darts, score, remaining,
      timestamp, is_checkout_attempt, is_bust, visit_number,
      running_average, first9_average
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    throwData.id,
    legId,
    throwData.playerId,
    JSON.stringify(throwData.darts ?? []),
    throwData.score ?? 0,
    throwData.remaining ?? 0,
    toEpochMs(throwData.timestamp) ?? fallbackTs,
    throwData.isCheckoutAttempt ? 1 : 0,
    throwData.isBust ? 1 : 0,
    throwData.visitNumber ?? 0,
    throwData.runningAverage ?? null,
    throwData.first9Average ?? null,
  );
};

/**
 * Writes legs and their throws for a match whose ownership the caller has
 * already verified. Legs and throws are written by primary key, so every
 * lookup is scoped to this match: an id that belongs to another match (and
 * possibly another tenant) is skipped, never overwritten.
 */
export const writeLegs = (db: Db, matchId: string, legs: Json[]) => {
  const now = Date.now();
  legs.forEach((leg, legIndex) => {
    if (!leg?.id) return;
    const legNumber = leg.legNumber ?? legIndex + 1;
    const startedAt = toEpochMs(leg.startedAt) ?? now;
    const completedAt = toEpochMs(leg.completedAt);

    const existingLeg = db.prepare('SELECT id FROM legs WHERE id = ? AND match_id = ?').get(leg.id, matchId);
    if (!existingLeg && db.prepare('SELECT 1 FROM legs WHERE id = ?').get(leg.id)) return;

    if (existingLeg) {
      db.prepare('UPDATE legs SET leg_number = ?, winner = ?, started_at = ?, completed_at = ? WHERE id = ?')
        .run(legNumber, leg.winner ?? null, startedAt, completedAt, leg.id);
    } else {
      db.prepare(`
        INSERT INTO legs (id, match_id, leg_number, winner, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(leg.id, matchId, legNumber, leg.winner ?? null, startedAt, completedAt);
    }

    if (!Array.isArray(leg.throws)) return;

    // Throws the client dropped (an undo, a removed player) must go too, or
    // a reload from the database brings them back.
    const keptThrowIds = leg.throws.map((t: Json) => t.id).filter(Boolean);
    if (keptThrowIds.length > 0) {
      db.prepare(`DELETE FROM throws WHERE leg_id = ? AND id NOT IN (${keptThrowIds.map(() => '?').join(', ')})`)
        .run(leg.id, ...keptThrowIds);
    } else {
      db.prepare('DELETE FROM throws WHERE leg_id = ?').run(leg.id);
    }

    for (const throwData of leg.throws) {
      if (!throwData?.id) continue;
      if (db.prepare('SELECT 1 FROM throws WHERE id = ? AND leg_id != ?').get(throwData.id, leg.id)) continue;
      writeThrow(db, leg.id, throwData, now);
    }
  });

  // Legs the client no longer has — an undo that stepped back out of a fresh
  // leg — disappear with it.
  const keptLegIds = legs.map(l => l?.id).filter(Boolean);
  if (keptLegIds.length > 0) {
    db.prepare(`DELETE FROM legs WHERE match_id = ? AND id NOT IN (${keptLegIds.map(() => '?').join(', ')})`)
      .run(matchId, ...keptLegIds);
  }
};

/**
 * POST semantics: create the match, or replace everything about it. The whole
 * match travels in the payload, so a re-sent final save must write the winner,
 * completion time and legs exactly like a first save.
 */
export const upsertMatch = (db: Db, tenantId: string, body: Json): 'created' | 'updated' => {
  const { id, gameType, status, players, settings, legs } = body;
  const startedAt = toEpochMs(body.startedAt) ?? Date.now();
  const completedAt = toEpochMs(body.completedAt);
  const winner = body.winner ?? null;

  const existing = db.prepare('SELECT id FROM matches WHERE id = ? AND tenant_id = ?').get(id, tenantId);

  db.transaction(() => {
    if (existing) {
      db.prepare(`
        UPDATE matches SET game_type = ?, status = ?, settings = ?, winner = ?, started_at = ?, completed_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(gameType, status || 'setup', JSON.stringify(settings), winner, startedAt, completedAt, id, tenantId);
      db.prepare('DELETE FROM match_players WHERE match_id = ?').run(id);
    } else {
      db.prepare(`
        INSERT INTO matches (id, tenant_id, game_type, status, winner, started_at, completed_at, settings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, tenantId, gameType, status || 'setup', winner, startedAt, completedAt, JSON.stringify(settings));
    }
    insertPlayers(db, id, players);
    if (Array.isArray(legs)) writeLegs(db, id, legs);
  })();

  return existing ? 'updated' : 'created';
};

/**
 * PUT semantics: a partial update. A field that is PRESENT in the body is
 * written, including null — undoing the end of a match has to clear winner and
 * completed_at, which the old truthiness checks made impossible.
 */
export const updateMatch = (db: Db, tenantId: string, id: string, body: Json): boolean => {
  const match = db.prepare('SELECT id FROM matches WHERE id = ? AND tenant_id = ?').get(id, tenantId);
  if (!match) return false;

  db.transaction(() => {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.status) { updates.push('status = ?'); params.push(body.status); }
    if ('winner' in body) { updates.push('winner = ?'); params.push(body.winner ?? null); }
    if ('completedAt' in body) { updates.push('completed_at = ?'); params.push(toEpochMs(body.completedAt)); }
    if (updates.length > 0) {
      db.prepare(`UPDATE matches SET ${updates.join(', ')} WHERE id = ?`).run(...params, id);
    }

    const { players, legs } = body;
    if (Array.isArray(players) && players.length > 0) {
      // The payload is the authoritative roster: a player removed from a running
      // match disappears here too. An empty array is never "wipe every player".
      const update = db.prepare(`
        UPDATE match_players SET
          match_average = ?, first9_average = ?, highest_score = ?,
          checkouts_hit = ?, checkout_attempts = ?,
          match_180s = ?, match_171_plus = ?, match_140_plus = ?, match_100_plus = ?, match_60_plus = ?,
          darts_thrown = ?, legs_won = ?, sets_won = ?
        WHERE match_id = ? AND player_id = ?
      `);
      for (const p of players) {
        update.run(
          p.matchAverage || 0, p.first9Average || 0, highestScoreOf(p),
          p.checkoutsHit || 0, p.checkoutAttempts || 0,
          p.match180s || 0, p.match171Plus || 0, p.match140Plus || 0, p.match100Plus || 0, p.match60Plus || 0,
          p.dartsThrown || 0, p.legsWon || 0, p.setsWon || 0,
          id, p.playerId,
        );
      }
      const keptIds = players.map((p: Json) => p.playerId);
      db.prepare(`DELETE FROM match_players WHERE match_id = ? AND player_id NOT IN (${keptIds.map(() => '?').join(', ')})`)
        .run(id, ...keptIds);
    }
    if (Array.isArray(legs)) writeLegs(db, id, legs);
  })();

  return true;
};
