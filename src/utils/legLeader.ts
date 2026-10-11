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
