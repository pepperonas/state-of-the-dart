import { Dart, Throw } from '../types/index';
import { calculateThrowScore, isBust } from './scoring';

/**
 * One source of truth for "what does this visit do to the score".
 *
 * The reducer, the auto-confirm effects in GameScreen and the bot all used to
 * recompute remaining / bust / checkout by hand — six copies, one of them with
 * the comment "must match isBust() in scoring.ts exactly". Double-in was never
 * implemented because it would have had to go into every copy.
 */

export interface VisitRules {
  startScore: number;
  doubleOut: boolean;
  doubleIn: boolean;
}

export interface VisitEvaluation {
  /** Score left before the visit. */
  previousRemaining: number;
  /** Face value of the darts, ignoring double-in. */
  rawScore: number;
  /** What the visit actually counts for (0 on a bust, double-in applied). */
  score: number;
  /** Score left after the visit (unchanged on a bust). */
  newRemaining: number;
  bust: boolean;
  checkout: boolean;
}

export const rulesOf = (settings: {
  startScore?: number;
  doubleOut?: boolean;
  doubleIn?: boolean;
}): VisitRules => ({
  startScore: settings.startScore || 501,
  doubleOut: settings.doubleOut ?? true,
  doubleIn: settings.doubleIn ?? false,
});

/** Points already scored in this leg by one player. */
export const scoredInLeg = (legThrows: Throw[], playerId: string): number =>
  legThrows.reduce((sum, t) => (t.playerId === playerId ? sum + t.score : sum), 0);

/**
 * Double-in: nothing counts until a double lands, and the double itself counts.
 * Once a player has scored in this leg they are "in" — any counted score
 * implies a double was hit, because only a double can open the scoring.
 */
export const countedScore = (darts: Dart[], alreadyIn: boolean, doubleIn: boolean): number => {
  if (!doubleIn || alreadyIn) return calculateThrowScore(darts);
  const opener = darts.findIndex(d => d.multiplier === 2);
  if (opener === -1) return 0;
  return calculateThrowScore(darts.slice(opener));
};

export const evaluateVisit = (
  rules: VisitRules,
  legThrows: Throw[],
  playerId: string,
  darts: Dart[],
): VisitEvaluation => {
  const scored = scoredInLeg(legThrows, playerId);
  const previousRemaining = rules.startScore - scored;
  const rawScore = calculateThrowScore(darts);
  const counted = countedScore(darts, scored > 0, rules.doubleIn);
  const lastDart = darts[darts.length - 1];
  const bust = darts.length > 0 && isBust(previousRemaining, counted, rules.doubleOut, lastDart);
  const checkout = !bust && darts.length > 0 && previousRemaining - counted === 0;

  return {
    previousRemaining,
    rawScore,
    score: bust ? 0 : counted,
    newRemaining: bust ? previousRemaining : previousRemaining - counted,
    bust,
    checkout,
  };
};
