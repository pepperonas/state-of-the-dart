/**
 * Who leads the current leg: the player with the lowest remaining score after
 * the confirmed visits. Nobody while the lowest score is shared — at the start
 * of a leg everyone is level. Busted visits score nothing.
 */
export const legLeaderId = (
  playerIds: string[],
  legThrows: { playerId: string; score: number; isBust?: boolean }[],
  startScore: number,
): string | null => {
  const remaining = new Map(playerIds.map(id => [id, startScore]));
  for (const t of legThrows) {
    if (t.isBust || !remaining.has(t.playerId)) continue;
    remaining.set(t.playerId, remaining.get(t.playerId)! - t.score);
  }
  let leader: string | null = null;
  let best = Infinity;
  let shared = false;
  for (const [id, r] of remaining) {
    if (r < best) { best = r; leader = id; shared = false; }
    else if (r === best) shared = true;
  }
  return shared ? null : leader;
};

/** Same rule from already known remaining scores (resume list): unique minimum, else nobody. */
export const legLeaderFromRemaining = (rows: { playerId: string; remaining?: number }[]): string | null => {
  let leader: string | null = null;
  let best = Infinity;
  let shared = false;
  for (const r of rows) {
    if (typeof r.remaining !== 'number') return null;
    if (r.remaining < best) { best = r.remaining; leader = r.playerId; shared = false; }
    else if (r.remaining === best) shared = true;
  }
  return shared ? null : leader;
};
