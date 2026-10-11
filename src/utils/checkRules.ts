/**
 * Check-in and check-out rules for X01: single (straight), double or triple.
 *
 * Settings carry them as flags (`doubleIn`/`tripleIn`, `doubleOut`/`tripleOut`)
 * so matches saved before triple rules existed keep their meaning: double-out
 * is on unless switched off, double-in off unless switched on.
 */
import { getCheckoutSuggestion } from '../data/checkoutTable';

export type CheckRule = 'single' | 'double' | 'triple';

interface RuleFlags {
  doubleIn?: boolean;
  tripleIn?: boolean;
  doubleOut?: boolean;
  tripleOut?: boolean;
}

export const inRuleOf = (s: RuleFlags): CheckRule =>
  s.tripleIn ? 'triple' : s.doubleIn ? 'double' : 'single';

export const outRuleOf = (s: RuleFlags): CheckRule =>
  s.tripleOut ? 'triple' : s.doubleOut === false ? 'single' : 'double';

/** The flags for a pair of rules — always consistent with each other. */
export const ruleSettings = (inRule: CheckRule, outRule: CheckRule) => ({
  doubleIn: inRule === 'double',
  tripleIn: inRule === 'triple',
  doubleOut: outRule === 'double',
  tripleOut: outRule === 'triple',
});

/** The multiplier a rule asks for (1 = any dart). */
export const ruleMultiplier = (rule: CheckRule): 1 | 2 | 3 =>
  rule === 'triple' ? 3 : rule === 'double' ? 2 : 1;

/** Smallest score that can still be finished under an out rule (D1 = 2, T1 = 3). */
export const minFinish = (rule: CheckRule): number => ruleMultiplier(rule);

/** Highest finish in three darts. */
export const maxFinish = (rule: CheckRule): number => (rule === 'double' ? 170 : 180);

/* Triple out ---------------------------------------------------------------- */

/** Setup darts in order of preference: big trebles first, then bulls, singles, doubles. */
const SETUP: { token: string; value: number }[] = [
  ...Array.from({ length: 20 }, (_, i) => ({ token: `T${20 - i}`, value: (20 - i) * 3 })),
  { token: 'Bull', value: 50 },
  { token: '25', value: 25 },
  ...Array.from({ length: 20 }, (_, i) => ({ token: String(20 - i), value: 20 - i })),
  ...Array.from({ length: 20 }, (_, i) => ({ token: `D${20 - i}`, value: (20 - i) * 2 })),
];

const tripleFinish = (score: number): string | null =>
  score >= 3 && score <= 60 && score % 3 === 0 ? `T${score / 3}` : null;

/** Fewest darts first, big setup darts first; the last dart is a triple. */
const tripleOutRoute = (score: number, dartsLeft: number): string[] | null => {
  const one = tripleFinish(score);
  if (one) return [one];
  if (dartsLeft >= 2) {
    for (const a of SETUP) {
      const f = tripleFinish(score - a.value);
      if (f) return [a.token, f];
    }
  }
  if (dartsLeft >= 3) {
    for (const a of SETUP) {
      for (const b of SETUP) {
        const f = tripleFinish(score - a.value - b.value);
        if (f) return [a.token, b.token, f];
      }
    }
  }
  return null;
};

/** The checkout route for `score` with `dartsLeft` darts under an out rule, or null. */
export const checkoutRoute = (score: number, dartsLeft: number, outRule: CheckRule): string[] | null => {
  if (score < minFinish(outRule) || score > maxFinish(outRule) || dartsLeft < 1) return null;
  if (outRule === 'triple') return tripleOutRoute(score, dartsLeft);
  return getCheckoutSuggestion(score, dartsLeft, outRule === 'double');
};

/**
 * Labels for the rules a match uses, for menus and lists: in-rule only when it
 * is not straight, out-rule only when it is not straight (as before: a plain
 * 501 just says "Double Out"). `short` = DI / TI / DO / TO.
 */
export const ruleTags = (s: RuleFlags): { key: string; short: string }[] => {
  const tags: { key: string; short: string }[] = [];
  const inRule = inRuleOf(s);
  const outRule = outRuleOf(s);
  if (inRule !== 'single') tags.push({ key: `game.${inRule}_in`, short: inRule === 'triple' ? 'TI' : 'DI' });
  if (outRule !== 'single') tags.push({ key: `game.${outRule}_out`, short: outRule === 'triple' ? 'TO' : 'DO' });
  return tags;
};
