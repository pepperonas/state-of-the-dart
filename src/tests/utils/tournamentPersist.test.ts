import { describe, it, expect } from 'vitest';
import type { Tournament } from '../../types';
import { BYE, buildKnockoutBracket, fromStoredTournament, toStoredTournament, tournamentProgress } from '../../utils/tournament';

const T0 = new Date(Date.UTC(2026, 8, 26, 20));

const knockout = (ids: string[]): Tournament => ({
  id: 't', name: 'Cup', type: 'knockout', status: 'in-progress', currentRound: 1, createdAt: T0, startedAt: T0,
  participants: ids.map(id => ({ id, playerId: `p-${id}`, wins: 0, losses: 0, legsFor: 0, legsAgainst: 0 })),
  matches: buildKnockoutBracket(ids),
  settings: { gameType: 'x01', matchSettings: { startScore: 501, legsToWin: 3, doubleOut: true } as Tournament['settings']['matchSettings'], bestOf: 5 },
});

describe('tournament persistence helpers', () => {
  it('round-trips through JSON with real Dates and pending scores', () => {
    const t = knockout(['a', 'b', 'c', 'd']);
    t.matches[0] = { ...t.matches[0], winner: 'a', completed: new Date(T0.getTime() + 60_000) };
    const wire = JSON.parse(JSON.stringify(toStoredTournament(t, { [t.matches[1].id]: { p1: 2, p2: 1 } })));
    const { tournament, scores } = fromStoredTournament(wire);
    expect(tournament.createdAt).toBeInstanceOf(Date);
    expect(tournament.createdAt.getTime()).toBe(T0.getTime());
    expect(tournament.matches[0].completed).toBeInstanceOf(Date);
    expect(tournament.matches[0].completed!.getTime()).toBe(T0.getTime() + 60_000);
    expect(tournament.matches[1].completed).toBeUndefined();
    expect(scores).toEqual({ [t.matches[1].id]: { p1: 2, p2: 1 } });
    expect('scores' in tournament).toBe(false);
  });

  it('counts progress without byes', () => {
    const t = knockout(['a', 'b', 'c']); // 4-slot bracket: one bye
    expect(t.matches.some(m => m.participant2Id === BYE)).toBe(true);
    const { total } = tournamentProgress(t);
    expect(total).toBe(2); // semi (a real pairing) + final; the bye is not a match
    t.matches = t.matches.map(m => (m.participant2Id !== BYE && m.round === 1 ? { ...m, winner: m.participant1Id } : m));
    expect(tournamentProgress(t).played).toBe(1);
  });
});
