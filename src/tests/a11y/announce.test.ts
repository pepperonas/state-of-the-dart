import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { Match, Throw } from '../../types';
import { announcementFor } from '../../utils/announce';

// Echo the key and options so the assertions pin *which* message and its values.
const t = ((key: string, o?: Record<string, unknown>) => `${key} ${JSON.stringify(o ?? {})}`) as unknown as TFunction;

const visit = (playerId: string, score: number, remaining: number, extra: Partial<Throw> = {}): Throw =>
  ({ id: `${playerId}-${score}-${remaining}`, playerId, darts: [], score, remaining, timestamp: new Date(0), visitNumber: 1, ...extra });

const match = (legs: Throw[][], winner?: string, legWinners: (string | undefined)[] = []): Match => ({
  id: 'm1', type: 'x01', settings: {} as Match['settings'],
  players: [{ playerId: 'a', name: 'Anna' }, { playerId: 'b', name: 'Ben' }] as Match['players'],
  legs: legs.map((throws, i) => ({ id: `l${i}`, throws, winner: legWinners[i], startedAt: new Date(0) })),
  currentLegIndex: legs.length - 1, currentSetIndex: 0, status: winner ? 'completed' : 'in-progress', winner, startedAt: new Date(0),
} as Match);

describe('announcementFor', () => {
  it('announces a visit with score and remaining', () => {
    const r = announcementFor(match([[]]), match([[visit('a', 100, 401)]]), t);
    expect(r).toBe('announce.visit {"name":"Anna","score":100,"remaining":401}');
  });

  it('announces a bust', () => {
    const r = announcementFor(match([[visit('a', 100, 40)]]), match([[visit('a', 100, 40), visit('b', 60, 32, { isBust: true })]]), t);
    expect(r).toContain('announce.bust');
    expect(r).toContain('"name":"Ben"');
  });

  it('announces a leg won even though a new empty leg has started', () => {
    const r = announcementFor(match([[visit('a', 100, 40)]]), match([[visit('a', 100, 40), visit('a', 40, 0)], []], undefined, ['a']), t);
    expect(r).toContain('announce.leg_won');
    expect(r).toContain('"score":40');
  });

  it('announces the match win', () => {
    const r = announcementFor(match([[visit('a', 100, 40)]]), match([[visit('a', 100, 40), visit('a', 40, 0)]], 'a', ['a']), t);
    expect(r).toContain('announce.match_won');
  });

  it('announces an undo with the restored remaining', () => {
    const r = announcementFor(match([[visit('a', 100, 401), visit('b', 60, 441)]]), match([[visit('a', 100, 401)]]), t);
    expect(r).toBe('announce.undo_to {"name":"Anna","remaining":401}');
  });

  it('stays silent when nothing was thrown or the match changed', () => {
    const m = match([[visit('a', 100, 401)]]);
    expect(announcementFor(m, m, t)).toBeNull();
    expect(announcementFor(null, m, t)).toBeNull();
    // A different match with more visits (switching or resuming) is not a new visit.
    const longer = match([[visit('a', 100, 401), visit('b', 60, 441)]]);
    expect(announcementFor({ ...m, id: 'other' }, longer, t)).toBeNull();
  });
});
