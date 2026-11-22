import type { Leg, MatchPlayer } from '../types';
import { calculateAverage } from './scoring';

/** The in-game statistics row of one player, for a set of legs (0.49.3). */
export interface ScopeStats {
  average: number;
  highest: number;
  s180: number;
  s140: number;
  s100: number;
  checkoutsHit: number;
  checkoutAttempts: number;
}

/**
 * The same buckets the match totals use (recomputePlayers in GameContext):
 * 180, 140–170 (171–179 is its own bucket), 100–139; busts count 0. Lets the
 * table show the current leg as well as the whole match (bug report 21.02.).
 */
export const scopeStats = (legs: Pick<Leg, 'throws' | 'winner'>[], playerId: string, startScore: number): ScopeStats => {
  const s: ScopeStats = { average: 0, highest: 0, s180: 0, s140: 0, s100: 0, checkoutsHit: 0, checkoutAttempts: 0 };
  const all = legs.flatMap(l => l.throws.filter(t => t.playerId === playerId));
  for (const t of all) {
    const v = t.isBust ? 0 : t.score;
    if (v === 180) s.s180++;
    else if (v >= 171) { /* own bucket */ }
    else if (v >= 140) s.s140++;
    else if (v >= 100) s.s100++;
    if (v > s.highest) s.highest = v;
  }
  s.average = calculateAverage(all);
  for (const l of legs) {
    if (l.winner === playerId) s.checkoutsHit++;
    let total = 0;
    for (const t of l.throws.filter(x => x.playerId === playerId)) {
      const before = startScore - total;
      if (before <= 170 && before > 0) s.checkoutAttempts++;
      total += t.score;
    }
  }
  return s;
};

/** The match totals already on the player, in the same shape. */
export const matchScopeStats = (p: MatchPlayer): ScopeStats => ({
  average: p.matchAverage, highest: p.matchHighestScore, s180: p.match180s, s140: p.match140Plus,
  s100: p.match100Plus, checkoutsHit: p.checkoutsHit, checkoutAttempts: p.checkoutAttempts,
});
