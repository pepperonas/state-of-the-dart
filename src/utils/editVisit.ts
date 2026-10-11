import type { Dart, Match, Throw } from '../types';
import { evaluateVisit, rulesOf } from './visit';

/**
 * Correcting a booked visit (0.32.0): replace its darts and re-score every
 * later visit of the leg in order, because each visit's remaining score and
 * bust depend on everything before it.
 *
 * Only visits of the leg in play can be re-scored. A visit of a finished leg
 * takes only a swap that scores the same (which beds a typed checkout hit);
 * anything else goes through the normal undo, which unwinds the leg win. A
 * correction that would turn any visit into a checkout is refused: finishing
 * a leg has its own flow (leg win, next leg, celebration) — retype the visit
 * after "undo" instead.
 */
export type EditVisitResult =
  | { ok: true; legIndex: number; throws: Throw[]; previousScore: number; score: number }
  | { ok: false; reason: 'not_found' | 'finished_leg' | 'checkout' | 'invalid' };

export const editVisit = (match: Match, throwId: string, darts: Dart[]): EditVisitResult => {
  if (darts.length === 0 || darts.length > 3) return { ok: false, reason: 'invalid' };
  const legIndex = match.legs.findIndex(l => l.throws.some(t => t.id === throwId));
  if (legIndex < 0) return { ok: false, reason: 'not_found' };
  const leg = match.legs[legIndex];
  const target = leg.throws.find(t => t.id === throwId)!;
  const rules = rulesOf(match.settings);
  const locked = legIndex !== match.currentLegIndex || !!leg.winner || match.status === 'completed';

  if (locked) {
    // A finished leg only takes a swap that scores exactly the same — telling
    // which beds a typed checkout hit, say. Nothing after it moves.
    const before = leg.throws.slice(0, leg.throws.indexOf(target));
    const v = evaluateVisit(rules, before, target.playerId, darts);
    if (v.newRemaining !== target.remaining || v.bust !== !!target.isBust || v.score !== target.score) {
      return { ok: false, reason: 'finished_leg' };
    }
    const throws = leg.throws.map(t => (t.id === throwId ? { ...t, darts } : t));
    return { ok: true, legIndex, throws, previousScore: target.score, score: v.score };
  }

  const rebuilt: Throw[] = [];
  let score = 0;
  for (const t of leg.throws) {
    const visitDarts = t.id === throwId ? darts : t.darts;
    const v = evaluateVisit(rules, rebuilt, t.playerId, visitDarts);
    if (v.checkout) return { ok: false, reason: 'checkout' };
    if (t.id === throwId) score = v.score;
    rebuilt.push({
      ...t,
      darts: visitDarts,
      score: v.score,
      remaining: v.newRemaining,
      isBust: v.bust,
      isCheckoutAttempt: v.previousRemaining <= 170,
    });
  }
  return { ok: true, legIndex, throws: rebuilt, previousScore: target.score, score };
};
