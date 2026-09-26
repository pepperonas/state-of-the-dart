import { describe, it, expect } from 'vitest';
import {
  BYE, advanceWinner, buildKnockoutBracket, isPlayable, knockoutChampion, recordResult, roundRobinChampion,
} from '../../utils/tournament';
import type { TournamentMatch, TournamentParticipant } from '../../types/index';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/** Plays the bracket to the end, the first-listed player always winning. */
const playOut = (matches: TournamentMatch[]) => {
  let m = matches;
  for (let guard = 0; guard < 64; guard++) {
    const next = m.find(isPlayable);
    if (!next) break;
    m = advanceWinner(m, next.id, next.participant1Id);
  }
  return m;
};

describe('buildKnockoutBracket', () => {
  it.each([[4, 3], [8, 7], [16, 15]])('%i players → %i matches, no extra final', (n, count) => {
    expect(buildKnockoutBracket(ids(n))).toHaveLength(count);
  });

  it.each([4, 5, 6, 7, 8, 11, 16])('a field of %i ends with exactly one champion', n => {
    const done = playOut(buildKnockoutBracket(ids(n)));
    expect(done.filter(isPlayable)).toHaveLength(0);
    expect(knockoutChampion(done)).toBe('p1');
  });

  it('decides byes at once and moves their players on', () => {
    const b = buildKnockoutBracket(ids(6));
    const byes = b.filter(m => m.round === 1 && (m.participant2Id === BYE));
    expect(byes).toHaveLength(2);
    byes.forEach(m => expect(m.winner).toBe(m.participant1Id));
    // p1 and p2 had the byes and meet in round 2.
    expect(b.filter(m => m.round === 2)[0]).toMatchObject({ participant1Id: 'p1', participant2Id: 'p2' });
  });

  it('never pairs two byes', () => {
    for (const n of [5, 6, 7, 9, 12]) {
      expect(buildKnockoutBracket(ids(n)).some(m => m.participant1Id === BYE && m.participant2Id === BYE)).toBe(false);
    }
  });

  it('never lets a player meet a bye in a playable match', () => {
    expect(buildKnockoutBracket(ids(5)).filter(isPlayable).every(m => m.participant2Id !== BYE)).toBe(true);
  });
});

describe('advanceWinner', () => {
  it('feeds match i of a round into slot i%2 of match ⌊i/2⌋', () => {
    const b = buildKnockoutBracket(ids(8));
    const r1 = b.filter(m => m.round === 1);
    let m = advanceWinner(b, r1[2].id, r1[2].participant2Id);
    m = advanceWinner(m, r1[3].id, r1[3].participant1Id);
    const r2 = m.filter(x => x.round === 2);
    expect(r2[1]).toMatchObject({ participant1Id: r1[2].participant2Id, participant2Id: r1[3].participant1Id });
  });

  it('does not mutate its input', () => {
    const b = buildKnockoutBracket(ids(4));
    const copy = JSON.parse(JSON.stringify(b));
    advanceWinner(b, b[0].id, b[0].participant1Id);
    expect(JSON.parse(JSON.stringify(b))).toEqual(copy);
  });
});

describe('results', () => {
  const people = (): TournamentParticipant[] => ['a', 'b', 'c'].map(id => ({
    id, playerId: id, seed: 1, wins: 0, losses: 0, legsFor: 0, legsAgainst: 0,
  }));

  it('credits each side with its own legs, whichever slot won', () => {
    const r = recordResult(people(), 'b', 'a', 3, 1);
    expect(r.find(p => p.id === 'b')).toMatchObject({ wins: 1, legsFor: 3, legsAgainst: 1 });
    expect(r.find(p => p.id === 'a')).toMatchObject({ losses: 1, legsFor: 1, legsAgainst: 3 });
  });

  it('round robin: most wins, then leg difference', () => {
    let r = recordResult(people(), 'a', 'b', 3, 2);
    r = recordResult(r, 'c', 'b', 3, 0);
    r = recordResult(r, 'c', 'a', 3, 2);
    expect(roundRobinChampion(r)).toBe('c');
  });
});
