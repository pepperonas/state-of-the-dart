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
