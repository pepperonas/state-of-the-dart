/**
 * Pure rules behind achievement unlocks. Kept out of the context and the hook
 * so every decision can be pinned by a unit test.
 */
import type { Dart, Match, MatchPlayer, Throw } from '../types/index';

/** Metrics where a smaller value is the better one ("finish in 12 darts"). */
export const LOWER_IS_BETTER = new Set([
  'game_time_max',
  'leg_darts',
  'leg_301_darts',
  'leg_701_darts',
  'checkout_darts_max',
  'avg_darts_per_leg_max',
]);

export interface UnlockRule {
  target: number;
  matchMode?: 'exact' | 'below';
}

/**
 * Whether `value` satisfies a requirement.
 * - `exact`: hits the target exactly.
 * - `below`: strictly under the target ("unter 12 Darts") — lower-better only.
 * - lower-better metrics: at most the target.
 * - everything else: at least the target.
 * A lower-better value of 0 never counts — it means "nothing measured".
 */
export const meetsRequirement = (metric: string, value: number, rule: UnlockRule): boolean => {
  if (rule.matchMode === 'exact') return value === rule.target;
  if (LOWER_IS_BETTER.has(metric)) {
    if (value <= 0) return false;
    return rule.matchMode === 'below' ? value < rule.target : value <= rule.target;
  }
  return value >= rule.target;
};

/**
 * "Unlock all achievements": an achievement of this kind cannot be part of its
 * own requirement, and two of them would each wait for the other. Counts only
 * the achievements that are not themselves "all achievements".
 */
export const allAchievementsReached = (
  unlockedIds: Iterable<string>,
  allIds: readonly string[],
  isAllKind: (id: string) => boolean,
): boolean => {
  const unlocked = new Set(unlockedIds);
  const required = allIds.filter(id => !isAllKind(id));
  return required.length > 0 && required.every(id => unlocked.has(id));
};

/** True when no dart was reconstructed from a typed total. */
export const hasExactDarts = (darts: Dart[]): boolean =>
  darts.length > 0 && darts.every(d => !d.estimated);

export const isMissDart = (d: Dart): boolean => d.multiplier === 0 || d.segment === 0;

/**
 * A visit that scored nothing because every dart missed. A bust is stored with
 * score 0 too, but its darts hit — it is not a zero visit.
 */
export const isZeroVisit = (score: number, isBust: boolean | undefined): boolean =>
  score === 0 && !isBust;

/**
 * Updates a run of consecutive missed darts. A typed 0 means all three darts
 * missed; any other typed total says nothing about single darts, so it ends
 * the run.
 */
export const nextMissStreak = (prev: number, darts: Dart[], score: number, isBust?: boolean): number => {
  if (isBust) return 0;
  if (!hasExactDarts(darts)) return score === 0 ? prev + 3 : 0;
  let run = prev;
  for (const d of darts) run = isMissDart(d) ? run + 1 : 0;
  return run;
};

/** Legs won over the whole match — `MatchPlayer.legsWon` resets every set. */
export const legsWonInMatch = (match: Match, playerId: string): number =>
  match.legs.filter(l => l.winner === playerId).length;

/**
 * The score a match is decided on: sets when the match is played in sets,
 * legs otherwise.
 */
export const matchScore = (match: Match, player: MatchPlayer): number =>
  (match.settings.setsToWin || 1) > 1 ? player.setsWon : legsWonInMatch(match, player.playerId);

/** Highest score among the other players. */
export const bestOpponentScore = (match: Match, playerId: string): number => {
  const others = match.players.filter(p => p.playerId !== playerId);
  return others.length ? Math.max(...others.map(p => matchScore(match, p))) : 0;
};

/** Visits of 100 or more in a match, across all the bucket counters. */
export const tonsInMatch = (p: MatchPlayer): number =>
  (p.match100Plus || 0) + (p.match140Plus || 0) + (p.match171Plus || 0) + (p.match180s || 0);

/**
 * Minimum checkout attempts a checkout-percentage tier asks for. Read from the
 * description ("min. 20 Versuche") so the definitions stay the single source.
 */
export const minCheckoutAttempts = (description: string): number => {
  const m = /min\.\s*(\d+)\s*Versuche/i.exec(description);
  return m ? Number(m[1]) : 10;
};

/** The leg winner's checkout visit was their first visit in checkout range. */
export const wonOnFirstCheckoutAttempt = (winnerThrows: Throw[]): boolean =>
  winnerThrows.length > 0 && winnerThrows.filter(t => t.isCheckoutAttempt).length === 1 &&
  !!winnerThrows[winnerThrows.length - 1].isCheckoutAttempt;
