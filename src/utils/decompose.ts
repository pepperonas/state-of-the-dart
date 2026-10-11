import type { Dart } from '../types';
import type { CheckRule } from './checkRules';
import { validateScore } from './scoring';

/**
 * Likely ways a typed visit total was thrown (0.32.0).
 *
 * A typed total ("60") says nothing about the beds, so it never reaches the
 * heatmap. Right after it is booked the app offers up to three plausible
 * decompositions as chips; one tap makes the darts exact. The ranking is a
 * simple plausibility model of a player aiming at the usual targets:
 *
 * - singles are the most common result, then trebles, then doubles;
 * - darts land in the cluster around the aim (20 with 1/5, 19 with 3/7,
 *   18 with 1/4, the bull) far more often than anywhere else;
 * - one aim per visit beats a visit spread across the board;
 * - a miss (0) is possible but rare.
 *
 * Lower cost = more likely. Every suggestion adds up exactly; a checkout ends
 * on a dart that satisfies the out rule and may use fewer than three darts.
 */

export interface DecomposeContext {
  /** The visit finished the leg. */
  isCheckout: boolean;
  outRule: CheckRule;
  /** A bust: the darts do not matter for the score, nothing is offered. */
  bust?: boolean;
}

const CLUSTER: Record<number, number> = { 20: 20, 1: 20, 5: 20, 19: 19, 3: 19, 7: 19, 18: 18, 4: 18 };
const AIMS = new Set([20, 19, 18]);

const dart = (segment: number, multiplier: 0 | 1 | 2 | 3): Dart => {
  if (segment === 0) return { segment: 0, multiplier: 0, score: 0, bed: 'miss' };
  if (segment === 25) return { segment: 25, multiplier: 1, score: 25, bed: 'outer-bull' };
  if (segment === 50) return { segment: 50, multiplier: 2, score: 50, bed: 'bull' };
  return { segment, multiplier, score: segment * multiplier, bed: multiplier === 3 ? 'triple' : multiplier === 2 ? 'double' : 'single' };
};

const ALL: Dart[] = (() => {
  const out: Dart[] = [];
  for (let s = 1; s <= 20; s++) for (const m of [1, 2, 3] as const) out.push(dart(s, m));
  out.push(dart(25, 1), dart(50, 2));
  return out;
})();
const MISS = dart(0, 0);

/** The aim a dart most likely came from (its cluster), or its own bed. */
const groupOf = (d: Dart): string =>
  d.segment === 0 ? 'miss' : d.segment === 25 || d.segment === 50 ? 'bull' : String(CLUSTER[d.segment] ?? d.segment);

const dartCost = (d: Dart): number => {
  if (d.segment === 0) return 1.0;
  if (d.segment === 25) return 1.6;
  if (d.segment === 50) return 2.4;
  const near = d.segment in CLUSTER;
  const base = d.multiplier === 1 ? 0 : d.multiplier === 3 ? (AIMS.has(d.segment) ? 1.2 : 3) : 2.8;
  // Most players aim at the 20; the 19 and 18 clusters are the next targets.
  const aim = !near ? 2.5 : CLUSTER[d.segment] === 20 ? 0 : 0.6;
  return base + aim;
};

const visitCost = (darts: Dart[]): number => {
  const groups = new Set(darts.filter(d => d.segment !== 0).map(groupOf));
  return darts.reduce((sum, d) => sum + dartCost(d), 0) + Math.max(0, groups.size - 1) * 1.5;
};

const finishes = (d: Dart, rule: CheckRule): boolean =>
  rule === 'single' ? true : rule === 'double' ? d.multiplier === 2 : d.multiplier === 3;

/** Bigger darts first, as a player reads a visit; a checkout keeps its finishing dart last. */
const order = (darts: Dart[]): Dart[] => [...darts].sort((a, b) => b.score - a.score || b.segment - a.segment);

export const likelyDecompositions = (total: number, ctx: DecomposeContext, limit = 3): Dart[][] => {
  if (ctx.bust || total <= 0 || !validateScore(total)) return [];
  const found: { darts: Dart[]; cost: number }[] = [];

  if (ctx.isCheckout) {
    const finishers = ALL.filter(d => finishes(d, ctx.outRule));
    for (const last of finishers) {
      const rest = total - last.score;
      // The finishing dart was aimed at: its own cost does not count against it.
      const aimed = (darts: Dart[]) => visitCost(darts) - dartCost(last);
      if (rest === 0) { found.push({ darts: [last], cost: aimed([last]) - 0.5 }); continue; }
      for (let i = 0; i < ALL.length; i++) {
        const a = ALL[i];
        if (a.score === rest) found.push({ darts: [a, last], cost: aimed([a, last]) });
        for (let j = i; j < ALL.length; j++) {
          const b = ALL[j];
          if (a.score + b.score === rest) {
            const lead = order([a, b]);
            found.push({ darts: [...lead, last], cost: aimed([a, b, last]) + 0.5 });
          }
        }
      }
    }
  } else {
    const pool = [MISS, ...ALL];
    for (let i = 0; i < pool.length; i++) {
      for (let j = i; j < pool.length; j++) {
        const partial = pool[i].score + pool[j].score;
        if (partial > total) continue;
        for (let k = j; k < pool.length; k++) {
          if (partial + pool[k].score !== total) continue;
          const darts = [pool[i], pool[j], pool[k]];
          found.push({ darts: order(darts), cost: visitCost(darts) });
        }
      }
    }
  }

  found.sort((a, b) => a.cost - b.cost);
  const seen = new Set<string>();
  const out: Dart[][] = [];
  for (const f of found) {
    const key = [...f.darts].map(d => `${d.segment}x${d.multiplier}`).sort().join(',') + (ctx.isCheckout ? `|${f.darts[f.darts.length - 1].segment}x${f.darts[f.darts.length - 1].multiplier}` : '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f.darts);
    if (out.length === limit) break;
  }
  return out;
};

/** Darts notation for chips and the visit list: T20, D16, 20, Bull, 25, 0. */
export const shortDart = (d: Pick<Dart, 'segment' | 'multiplier'>): string =>
  d.segment === 0 || d.multiplier === 0 ? '0'
  : d.segment === 50 ? 'Bull'
  : d.segment === 25 ? '25'
  : `${d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : ''}${d.segment}`;
