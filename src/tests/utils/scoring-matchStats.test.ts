import { describe, it, expect } from 'vitest';
import { calculateMatchStats } from '../../utils/scoring';
import { Match, Dart, Throw, Leg, MatchPlayer } from '../../types';

const makeDart = (segment: number, multiplier: 0 | 1 | 2 | 3, score: number): Dart => ({
  segment,
  multiplier,
  score,
});

const makeThrow = (playerId: string, darts: Dart[], opts: Partial<Throw> = {}): Throw => ({
  id: `throw-${Math.random()}`,
  playerId,
  darts,
  score: darts.reduce((s, d) => s + d.score, 0),
  remaining: 501,
  timestamp: new Date(),
  visitNumber: 1,
  ...opts,
});

const makeLeg = (throws: Throw[], winner?: string): Leg => ({
  id: `leg-${Math.random()}`,
  throws,
  winner,
  startedAt: new Date(),
});

const makePlayer = (playerId: string, name: string): MatchPlayer => ({
  playerId,
  name,
  setsWon: 0,
  legsWon: 0,
  matchAverage: 0,
  matchHighestScore: 0,
  match180s: 0,
  match171Plus: 0,
  match140Plus: 0,
  match100Plus: 0,
  match60Plus: 0,
  checkoutAttempts: 0,
  checkoutsHit: 0,
});

const makeMatch = (players: MatchPlayer[], legs: Leg[]): Match => ({
  id: 'match-1',
  type: 'x01',
  settings: { startScore: 501, legsToWin: 3 },
  players,
  legs,
  currentLegIndex: 0,
  currentSetIndex: 0,
  status: 'completed',
  startedAt: new Date(),
});

describe('calculateMatchStats', () => {
  it('should return stats for each player', () => {
    const p1 = makePlayer('p1', 'Alice');
    const p2 = makePlayer('p2', 'Bob');
    const match = makeMatch([p1, p2], [makeLeg([])]);
    const stats = calculateMatchStats(match);
    expect(stats).toHaveProperty('p1');
    expect(stats).toHaveProperty('p2');
  });

  it('should calculate average correctly', () => {
    const p1 = makePlayer('p1', 'Alice');
    const leg = makeLeg([
      makeThrow('p1', [
        makeDart(20, 3, 60),
        makeDart(20, 3, 60),
        makeDart(20, 3, 60),
      ]),
    ]);
    const match = makeMatch([p1], [leg]);
    const stats = calculateMatchStats(match);
    // 180 / 3 darts * 3 = 180
    expect(stats.p1.average).toBe(180);
  });

  it('should calculate first9Average', () => {
    const p1 = makePlayer('p1', 'Alice');
    const leg = makeLeg([
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]),
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]),
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]),
    ]);
    const match = makeMatch([p1], [leg]);
    const stats = calculateMatchStats(match);
    expect(stats.p1.first9Average).toBe(180);
  });

  it('should find highest score', () => {
    const p1 = makePlayer('p1', 'Alice');
    const leg = makeLeg([
      makeThrow('p1', [makeDart(20, 1, 20), makeDart(20, 1, 20), makeDart(20, 1, 20)]), // 60
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]), // 180
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(19, 3, 57), makeDart(18, 3, 54)]), // 171
    ]);
    const match = makeMatch([p1], [leg]);
    const stats = calculateMatchStats(match);
    expect(stats.p1.highestScore).toBe(180);
  });

  it('should count 180s', () => {
    const p1 = makePlayer('p1', 'Alice');
    const leg = makeLeg([
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]), // 180
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]), // 180
      makeThrow('p1', [makeDart(20, 1, 20), makeDart(20, 1, 20), makeDart(20, 1, 20)]), // 60
    ]);
    const match = makeMatch([p1], [leg]);
    const stats = calculateMatchStats(match);
    expect(stats.p1.total180s).toBe(2);
  });

  it('should count score categories (171+, 140+, 100+, 60+)', () => {
    const p1 = makePlayer('p1', 'Alice');
    const leg = makeLeg([
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]), // 180
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(19, 3, 57), makeDart(18, 3, 54)]), // 171
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 1, 20)]), // 140
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 1, 20), makeDart(20, 1, 20)]), // 100
      makeThrow('p1', [makeDart(20, 1, 20), makeDart(20, 1, 20), makeDart(20, 1, 20)]), // 60
      makeThrow('p1', [makeDart(5, 1, 5), makeDart(5, 1, 5), makeDart(5, 1, 5)]),       // 15
    ]);
    const match = makeMatch([p1], [leg]);
    const stats = calculateMatchStats(match);
    // 171+ includes 180 and 171
    expect(stats.p1.total171Plus).toBe(2);
    // 140+ includes 180, 171, 140
    expect(stats.p1.total140Plus).toBe(3);
    // 100+ includes 180, 171, 140, 100
    expect(stats.p1.total100Plus).toBe(4);
    // 60+ includes 180, 171, 140, 100, 60
    expect(stats.p1.total60Plus).toBe(5);
  });

  it('should count checkout attempts', () => {
    const p1 = makePlayer('p1', 'Alice');
    const leg = makeLeg([
      makeThrow('p1', [makeDart(20, 3, 60)], { isCheckoutAttempt: true }),
      makeThrow('p1', [makeDart(20, 3, 60)], { isCheckoutAttempt: true }),
      makeThrow('p1', [makeDart(20, 3, 60)], { isCheckoutAttempt: false }),
    ]);
    const match = makeMatch([p1], [leg]);
    const stats = calculateMatchStats(match);
    expect(stats.p1.checkoutAttempts).toBe(2);
  });

  it('should count checkouts hit as legs won', () => {
    const p1 = makePlayer('p1', 'Alice');
    const p2 = makePlayer('p2', 'Bob');
    const legs = [
      makeLeg([makeThrow('p1', [makeDart(20, 3, 60)])], 'p1'),
      makeLeg([makeThrow('p2', [makeDart(20, 3, 60)])], 'p2'),
      makeLeg([makeThrow('p1', [makeDart(20, 3, 60)])], 'p1'),
    ];
    const match = makeMatch([p1, p2], legs);
    const stats = calculateMatchStats(match);
    expect(stats.p1.checkoutsHit).toBe(2);
    expect(stats.p2.checkoutsHit).toBe(1);
  });

  it('should aggregate stats across multiple legs', () => {
    const p1 = makePlayer('p1', 'Alice');
    const leg1 = makeLeg([
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]), // 180
    ], 'p1');
    const leg2 = makeLeg([
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]), // 180
    ], 'p1');
    const match = makeMatch([p1], [leg1, leg2]);
    const stats = calculateMatchStats(match);
    expect(stats.p1.total180s).toBe(2);
    expect(stats.p1.average).toBe(180);
  });

  it('should isolate stats per player in multi-player match', () => {
    const p1 = makePlayer('p1', 'Alice');
    const p2 = makePlayer('p2', 'Bob');
    const leg = makeLeg([
      makeThrow('p1', [makeDart(20, 3, 60), makeDart(20, 3, 60), makeDart(20, 3, 60)]), // p1: 180
      makeThrow('p2', [makeDart(20, 1, 20), makeDart(20, 1, 20), makeDart(20, 1, 20)]), // p2: 60
    ]);
    const match = makeMatch([p1, p2], [leg]);
    const stats = calculateMatchStats(match);
    expect(stats.p1.average).toBe(180);
    expect(stats.p2.average).toBe(60);
    expect(stats.p1.total180s).toBe(1);
    expect(stats.p2.total180s).toBe(0);
  });

  it('should return 0 highest score when no throws exist', () => {
    const p1 = makePlayer('p1', 'Alice');
    const match = makeMatch([p1], [makeLeg([])]);
    const stats = calculateMatchStats(match);
    expect(stats.p1.highestScore).toBe(0);
  });
});
