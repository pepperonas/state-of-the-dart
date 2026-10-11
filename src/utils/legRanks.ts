/**
 * Standing in the current leg: rank 1 is the lowest remaining score after the
 * confirmed visits. A shared score shares the rank and the next one is skipped
 * (1, 1, 3). While everyone is level — at the start of a leg — nobody has a
 * rank. Busted visits score nothing.
 */
export const legRanks = (
  playerIds: string[],
  legThrows: { playerId: string; score: number; isBust?: boolean }[],
  startScore: number,
): Map<string, number | null> => {
  const remaining = new Map(playerIds.map(id => [id, startScore]));
  for (const t of legThrows) {
    if (t.isBust || !remaining.has(t.playerId)) continue;
    remaining.set(t.playerId, remaining.get(t.playerId)! - t.score);
  }
  const scores = [...remaining.values()];
  const allLevel = scores.every(s => s === scores[0]);
  return new Map(playerIds.map(id => {
    if (allLevel) return [id, null];
    const own = remaining.get(id)!;
    return [id, 1 + scores.filter(s => s < own).length];
  }));
};

/** Colour step for a rank: 1 green, 2 yellow, 3 orange, 4 red, 5+ neutral. */
export const rankTone = (rank: number): 1 | 2 | 3 | 4 | 5 =>
  (Math.min(Math.max(rank, 1), 5) as 1 | 2 | 3 | 4 | 5);
