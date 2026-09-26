import { Dart } from '../types/index';

export interface SequenceStep {
  /** Target after the visit. */
  target: number;
  /** Darts that hit a target in sequence. */
  hits: number;
  /** Points of those darts. */
  points: number;
  completed: boolean;
}

/**
 * Walks the darts of one visit through a target sequence (around the clock,
 * doubles, triples). Each dart that hits the CURRENT target moves it on, so
 * D1 D2 D3 in one visit clears three targets. The old code only ever moved
 * one step per visit, however many darts hit.
 */
export const advanceThroughSequence = (
  darts: Dart[],
  target: number,
  rule: { multiplier?: 2 | 3; last: number; step: 1 | -1 },
): SequenceStep => {
  let current = target;
  let hits = 0;
  let points = 0;
  let completed = false;
  for (const dart of darts) {
    if (completed) break;
    const onTarget = dart.segment === current && (rule.multiplier === undefined || dart.multiplier === rule.multiplier);
    if (!onTarget) continue;
    hits++;
    points += dart.score;
    if (current === rule.last) completed = true;
    else current += rule.step;
  }
  return { target: current, hits, points, completed };
};

/** Bob's 27 goes D1 … D20, then the bull. */
export const BOBS_27_ROUNDS = 21;
export const BOBS_27_BULL = 25;

const isDoubleOf = (dart: Dart, target: number) =>
  dart.multiplier === 2 &&
  (dart.segment === target || (target === BOBS_27_BULL && (dart.segment === 25 || dart.segment === 50)));

/**
 * One round of Bob's 27. Every dart in the round's double scores the double's
 * value; a round without one costs that value. The old code added or took a
 * flat 3 and counted a hit anywhere in the segment.
 */
export const bobs27Round = (score: number, target: number, darts: Dart[]) => {
  const value = target === BOBS_27_BULL ? 50 : target * 2;
  const hits = darts.filter(d => isDoubleOf(d, target)).length;
  const newScore = score + (hits > 0 ? hits * value : -value);
  const lastRound = target === BOBS_27_BULL;
  return {
    hits,
    score: newScore,
    nextTarget: target === 20 ? BOBS_27_BULL : target + 1,
    completed: lastRound || newScore <= 0,
    busted: newScore <= 0,
  };
};
