import { describe, it, expect } from 'vitest';
import type { CheckoutRoute } from '../../types/index';
import {
  checkoutTable,
  getCheckoutSuggestion,
  getCheckoutAlternatives,
  isCheckoutPossible,
  getBogeyNumbers,
} from '../../data/checkoutTable';

/**
 * The checkout table is the one place where a silent typo becomes a wrong answer
 * on screen: a route that does not add up tells a player to throw at the wrong
 * bed. Rather than spot-check a handful of scores, these tests validate every
 * route in the table mechanically.
 */

/**
 * Value of one dart in the app's notation (`T20`, `D16`, `S5`, `Bull`).
 *
 * ⚠️ `'25'` is the outer bull and the single exception to the S/D/T scheme —
 * see the notation test below. It is standard darts shorthand and the strings
 * are only ever rendered, never parsed, so it is modelled rather than "fixed".
 */
function dartValue(d: string): number {
  if (d === 'Bull') return 50;   // inner bull, counts as a double
  if (d === '25') return 25;     // outer bull, not a double
  const m = /^([SDT])(\d{1,2})$/.exec(d);
  if (!m) throw new Error(`unparseable dart: ${d}`);
  const [, mult, seg] = m;
  const n = Number(seg);
  return n * (mult === 'T' ? 3 : mult === 'D' ? 2 : 1);
}

function isDouble(d: string): boolean {
  return d === 'Bull' || /^D\d{1,2}$/.test(d);
}

const entries: Array<[number, CheckoutRoute[]]> =
  Object.entries(checkoutTable).map(([k, v]) => [Number(k), v as CheckoutRoute[]]);

describe('checkout table integrity', () => {
  it('covers a plausible range of finishes', () => {
    expect(entries.length).toBeGreaterThan(150);
    const scores = entries.map(([s]) => s);
    expect(Math.max(...scores)).toBe(170);
    expect(Math.min(...scores)).toBe(2);
  });

  /** The load-bearing one: every route must actually sum to its score. */
  it('every route sums to exactly its score', () => {
    const wrong: string[] = [];
    for (const [score, routes] of entries) {
      for (const route of routes) {
        const sum = route.darts.reduce((n, d) => n + dartValue(d), 0);
        if (sum !== score) wrong.push(`${score}: ${route.darts.join(' ')} = ${sum}`);
      }
    }
    expect(wrong, `Routes that do not add up:\n${wrong.join('\n')}`).toEqual([]);
  });

  /** X01 is double-out: the last dart of a checkout must be a double. */
  it('every route finishes on a double', () => {
    const wrong: string[] = [];
    for (const [score, routes] of entries) {
      for (const route of routes) {
        const last = route.darts[route.darts.length - 1];
        if (!isDouble(last)) wrong.push(`${score}: ends on ${last}`);
      }
    }
    expect(wrong, `Routes not ending on a double:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('no route needs more than three darts', () => {
    const tooLong = entries
      .flatMap(([score, routes]) => routes.map((r) => ({ score, r })))
      .filter(({ r }) => r.darts.length > 3)
      .map(({ score, r }) => `${score}: ${r.darts.length} darts`);
    expect(tooLong).toEqual([]);
  });

  it('every score offers exactly one preferred route', () => {
    const bad: string[] = [];
    for (const [score, routes] of entries) {
      const preferred = routes.filter((r) => r.preferred).length;
      if (preferred !== 1) bad.push(`${score}: ${preferred} preferred`);
    }
    expect(bad, `Scores without exactly one preferred route:\n${bad.join('\n')}`).toEqual([]);
  });

  it('the stored score matches the key', () => {
    const mismatched = entries
      .flatMap(([score, routes]) => routes.filter((r) => r.score !== score).map((r) => `${score} vs ${r.score}`));
    expect(mismatched).toEqual([]);
  });

  it('uses only reachable beds', () => {
    const bad: string[] = [];
    for (const [, routes] of entries) {
      for (const d of routes.flatMap((r) => r.darts)) {
        if (d === 'Bull' || d === '25') continue;
        const m = /^([SDT])(\d{1,2})$/.exec(d);
        if (!m || Number(m[2]) < 1 || Number(m[2]) > 20) bad.push(d);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  /**
   * Pins the notation the table actually uses. `'25'` (outer bull) is the only
   * token outside the S/D/T + `Bull` scheme; it appears exactly once, in the
   * 125 finish. Recorded here so it is a known exception rather than a surprise
   * to the next reader — or to any future code that parses these strings.
   */
  it('uses one consistent notation, with a single documented exception', () => {
    const tokens = new Set(entries.flatMap(([, routes]) => routes.flatMap((r) => r.darts)));
    const offScheme = [...tokens].filter((d) => d !== 'Bull' && !/^[SDT]\d{1,2}$/.test(d));
    expect(offScheme, 'unexpected notation in the checkout table').toEqual(['25']);

    const usesOuterBull = entries
      .filter(([, routes]) => routes.some((r) => r.darts.includes('25')))
      .map(([score]) => score);
    expect(usesOuterBull).toEqual([125]);
  });
});

describe('getCheckoutSuggestion (double out)', () => {
  it('returns the classic finishes', () => {
    expect(getCheckoutSuggestion(170)).toEqual(['T20', 'T20', 'Bull']);
    expect(getCheckoutSuggestion(40)).toEqual(['D20']);
    expect(getCheckoutSuggestion(2)).toEqual(['D1']);
  });

  it('refuses scores outside the checkout range', () => {
    expect(getCheckoutSuggestion(171)).toBeNull();
    expect(getCheckoutSuggestion(180)).toBeNull();
    expect(getCheckoutSuggestion(0)).toBeNull();
    expect(getCheckoutSuggestion(-5)).toBeNull();
  });

  /** The seven scores that cannot be finished in three darts. */
  it('refuses every bogey number', () => {
    for (const bogey of getBogeyNumbers()) {
      expect(getCheckoutSuggestion(bogey), `${bogey} should have no finish`).toBeNull();
    }
  });

  it('refuses a route that does not fit the darts left', () => {
    // 170 needs three darts.
    expect(getCheckoutSuggestion(170, 2)).toBeNull();
    expect(getCheckoutSuggestion(170, 1)).toBeNull();
    // 40 needs one.
    expect(getCheckoutSuggestion(40, 1)).toEqual(['D20']);
  });

  it('every suggestion it returns is itself a valid finish', () => {
    const bad: string[] = [];
    for (let score = 2; score <= 170; score++) {
      const darts = getCheckoutSuggestion(score);
      if (!darts) continue;
      const sum = darts.reduce((n, d) => n + dartValue(d), 0);
      if (sum !== score) bad.push(`${score} -> ${darts.join(' ')} = ${sum}`);
      if (!isDouble(darts[darts.length - 1])) bad.push(`${score} -> does not end on a double`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('never suggests more darts than are left', () => {
    for (let score = 2; score <= 170; score++) {
      for (const left of [1, 2, 3]) {
        const darts = getCheckoutSuggestion(score, left);
        if (darts) expect(darts.length, `${score} with ${left} darts`).toBeLessThanOrEqual(left);
      }
    }
  });
});

describe('getCheckoutSuggestion (straight out)', () => {
  it('finishes a simple score without needing a double', () => {
    expect(getCheckoutSuggestion(20, 3, false)).toEqual(['S20']);
    expect(getCheckoutSuggestion(60, 3, false)).toEqual(['T20']);
  });

  it('the darts it returns add up to the score', () => {
    for (const score of [7, 20, 41, 60, 100, 120, 170]) {
      const darts = getCheckoutSuggestion(score, 3, false);
      if (!darts) continue;
      expect(darts.reduce((n, d) => n + dartValue(d), 0), `score ${score}`).toBe(score);
    }
  });

  it('gives up rather than returning a partial route', () => {
    // 170 straight-out cannot be done in one dart.
    expect(getCheckoutSuggestion(170, 1, false)).toBeNull();
  });
});

describe('getCheckoutAlternatives', () => {
  it('offers only non-preferred routes', () => {
    for (const [score, routes] of entries) {
      const alts = getCheckoutAlternatives(score);
      const preferred = routes.find((r) => r.preferred)!.darts.join(' ');
      expect(alts.map((a) => a.join(' ')), `score ${score}`).not.toContain(preferred);
    }
  });

  it('never offers a route longer than the darts left', () => {
    for (const [score] of entries) {
      for (const left of [1, 2, 3]) {
        for (const alt of getCheckoutAlternatives(score, left)) {
          expect(alt.length, `${score} with ${left}`).toBeLessThanOrEqual(left);
        }
      }
    }
  });

  it('is empty for straight-out and out-of-range scores', () => {
    expect(getCheckoutAlternatives(100, 3, false)).toEqual([]);
    expect(getCheckoutAlternatives(171)).toEqual([]);
    expect(getCheckoutAlternatives(1)).toEqual([]);
  });

  it('every alternative is itself a valid finish', () => {
    const bad: string[] = [];
    for (const [score] of entries) {
      for (const alt of getCheckoutAlternatives(score)) {
        const sum = alt.reduce((n, d) => n + dartValue(d), 0);
        if (sum !== score) bad.push(`${score} -> ${alt.join(' ')} = ${sum}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('isCheckoutPossible', () => {
  it('agrees with getCheckoutSuggestion for every score', () => {
    for (let score = 0; score <= 180; score++) {
      for (const left of [1, 2, 3]) {
        expect(isCheckoutPossible(score, left), `${score}/${left}`)
          .toBe(getCheckoutSuggestion(score, left) !== null);
      }
    }
  });

  it('is false for the bogey numbers', () => {
    for (const bogey of getBogeyNumbers()) expect(isCheckoutPossible(bogey)).toBe(false);
  });
});

describe('getBogeyNumbers', () => {
  it('is the accepted set of three-dart-impossible scores', () => {
    expect([...getBogeyNumbers()].sort((a, b) => a - b)).toEqual([159, 162, 163, 165, 166, 168, 169]);
  });

  /**
   * The explicit bogey guard in `getCheckoutSuggestion` is belt-and-braces: none
   * of these scores is in the table either, so `!routes` would already refuse
   * them. Pinned as a *policy* — if someone ever added a 159 route, the guard is
   * what keeps it refused. (This is why mutating the guard alone changes no
   * behaviour: an equivalent mutation, not a gap in the tests.)
   */
  it('is refused by the table and by the explicit guard, independently', () => {
    for (const bogey of getBogeyNumbers()) {
      expect(checkoutTable[bogey], `${bogey} must not be in the table`).toBeUndefined();
      expect(getCheckoutSuggestion(bogey), `${bogey} must be refused`).toBeNull();
    }
  });

  /** The list is duplicated inside `getCheckoutSuggestion`; they must not drift. */
  it('matches what the suggester actually refuses', () => {
    const refused: number[] = [];
    for (let score = 159; score <= 170; score++) {
      if (getCheckoutSuggestion(score) === null) refused.push(score);
    }
    expect(refused.sort((a, b) => a - b)).toEqual([...getBogeyNumbers()].sort((a, b) => a - b));
  });
});
