/**
 * The feedback ladder of the game screen: how big a moment a visit is.
 *
 *   1 — every visit (count-down, "−60" chip)
 *   2 — 100+ (a spark, a stronger haptic)
 *   3 — 180 or a checkout of 100+ (the hero moment)
 *   'bust' — its own feedback, never a success pattern
 *
 * Leg and match wins are the overlays above that.
 */
export type FeedbackLevel = 1 | 2 | 3 | 'bust';

export const feedbackLevel = (v: { score: number; bust: boolean; checkout: boolean }): FeedbackLevel => {
  if (v.bust) return 'bust';
  if (v.score === 180 || (v.checkout && v.score >= 100)) return 3;
  if (v.score >= 100) return 2;
  return 1;
};

export interface Baseline {
  /** Best visit so far (0 = nothing recorded). */
  highestScore: number;
  /** Fewest darts for a won 501 leg so far (0 = nothing recorded). */
  shortestLeg: number;
}

export type PersonalBestHit = { kind: 'visit' | 'leg'; value: number };

/**
 * New personal bests set by this visit — only against a real baseline: when
 * nothing has been recorded yet, a "record" would be a claim about nothing.
 */
export const personalBestHits = (
  bests: Baseline,
  v: { score: number; legWonInDarts: number | null; startScore: number },
): PersonalBestHit[] => {
  const hits: PersonalBestHit[] = [];
  if (bests.highestScore > 0 && v.score > bests.highestScore) hits.push({ kind: 'visit', value: v.score });
  if (v.legWonInDarts != null && v.startScore === 501 && bests.shortestLeg > 0 && v.legWonInDarts < bests.shortestLeg) {
    hits.push({ kind: 'leg', value: v.legWonInDarts });
  }
  return hits;
};
