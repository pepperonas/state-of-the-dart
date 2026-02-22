import { describe, it, expect } from 'vitest';
import { calculateImprovement } from '../../utils/exportImport';
import { Match, MatchPlayer } from '../../types';

// Helper to create minimal Match objects for calculateImprovement
const makeMatch = (
  startedAt: string,
  matchAverage: number,
  checkoutsHit = 0,
  checkoutAttempts = 0,
): Match => ({
  id: `match-${startedAt}`,
  type: 'x01',
  settings: { startScore: 501, legsToWin: 3 },
  players: [
    {
      playerId: 'p1',
      name: 'Player 1',
      setsWon: 0,
      legsWon: 0,
      matchAverage,
      matchHighestScore: 0,
      match180s: 0,
      match171Plus: 0,
      match140Plus: 0,
      match100Plus: 0,
      match60Plus: 0,
      checkoutAttempts,
      checkoutsHit,
    } as MatchPlayer,
  ],
  legs: [],
  currentLegIndex: 0,
  currentSetIndex: 0,
  status: 'completed',
  startedAt: new Date(startedAt),
});

describe('calculateImprovement', () => {
  it('should return zeroed metrics for empty matches', () => {
    const result = calculateImprovement([]);
    expect(result.averageImprovement).toBe(0);
    expect(result.checkoutImprovement).toBe(0);
    expect(result.trend).toBe('stable');
    expect(result.recentAverage).toBe(0);
    expect(result.historicAverage).toBe(0);
  });

  it('should calculate recentAverage from last 10 matches', () => {
    // 15 matches: first 5 avg=40, last 10 avg=60
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 40)),
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-02-${(i + 1).toString().padStart(2, '0')}`, 60)),
    ];
    const result = calculateImprovement(matches);
    expect(result.recentAverage).toBe(60);
  });

  it('should calculate historicAverage from matches before last 10', () => {
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 40)),
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-02-${(i + 1).toString().padStart(2, '0')}`, 60)),
    ];
    const result = calculateImprovement(matches);
    expect(result.historicAverage).toBe(40);
  });

  it('should set historicAverage to recentAverage when <= 10 matches', () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 50),
    );
    const result = calculateImprovement(matches);
    expect(result.historicAverage).toBe(result.recentAverage);
  });

  it('should detect "improving" trend when recent avg > historic by >2', () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 40)),
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-02-${(i + 1).toString().padStart(2, '0')}`, 55)),
    ];
    const result = calculateImprovement(matches);
    expect(result.trend).toBe('improving');
    expect(result.averageImprovement).toBeGreaterThan(2);
  });

  it('should detect "declining" trend when recent avg < historic by >2', () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 70)),
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-02-${(i + 1).toString().padStart(2, '0')}`, 50)),
    ];
    const result = calculateImprovement(matches);
    expect(result.trend).toBe('declining');
    expect(result.averageImprovement).toBeLessThan(-2);
  });

  it('should detect "stable" trend when difference is within ±2', () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 50)),
      ...Array.from({ length: 10 }, (_, i) => makeMatch(`2026-02-${(i + 1).toString().padStart(2, '0')}`, 51)),
    ];
    const result = calculateImprovement(matches);
    expect(result.trend).toBe('stable');
  });

  it('should calculate checkout improvement percentage', () => {
    const matches = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 50, 1, 5), // 20% checkout
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makeMatch(`2026-02-${(i + 1).toString().padStart(2, '0')}`, 50, 2, 5), // 40% checkout
      ),
    ];
    const result = calculateImprovement(matches);
    // Recent: 0.4 avg, Historic: 0.2 avg → improvement = (0.4 - 0.2) * 100 = 20
    expect(result.checkoutImprovement).toBe(20);
  });

  it('should find best period across 5-match sliding window', () => {
    const matches = [
      makeMatch('2026-01-01', 40),
      makeMatch('2026-01-02', 40),
      makeMatch('2026-01-03', 40),
      makeMatch('2026-01-04', 40),
      makeMatch('2026-01-05', 40),
      makeMatch('2026-01-06', 80),
      makeMatch('2026-01-07', 80),
      makeMatch('2026-01-08', 80),
      makeMatch('2026-01-09', 80),
      makeMatch('2026-01-10', 80),
    ];
    const result = calculateImprovement(matches);
    expect(result.bestPeriod.average).toBe(80);
  });

  it('should find worst period across 5-match sliding window', () => {
    const matches = [
      makeMatch('2026-01-01', 80),
      makeMatch('2026-01-02', 80),
      makeMatch('2026-01-03', 80),
      makeMatch('2026-01-04', 80),
      makeMatch('2026-01-05', 80),
      makeMatch('2026-01-06', 30),
      makeMatch('2026-01-07', 30),
      makeMatch('2026-01-08', 30),
      makeMatch('2026-01-09', 30),
      makeMatch('2026-01-10', 30),
    ];
    const result = calculateImprovement(matches);
    expect(result.worstPeriod.average).toBe(30);
  });

  it('should handle fewer than 5 matches — no best/worst sliding window', () => {
    const matches = [
      makeMatch('2026-01-01', 50),
      makeMatch('2026-01-02', 60),
    ];
    const result = calculateImprovement(matches);
    // With < 5 matches, the sliding window loop never executes
    // bestPeriod.average stays 0, worstPeriod.average stays 999
    expect(result.bestPeriod.average).toBe(0);
    expect(result.worstPeriod.average).toBe(999);
  });

  it('should sort matches chronologically regardless of input order', () => {
    const matches = [
      makeMatch('2026-02-01', 80),
      makeMatch('2026-01-01', 40),
    ];
    const result = calculateImprovement(matches);
    // Both are "recent" (<=10), historicAverage = recentAverage
    expect(result.recentAverage).toBe(60); // (40 + 80) / 2
  });

  it('should handle matches with zero checkout attempts', () => {
    const matches = Array.from({ length: 12 }, (_, i) =>
      makeMatch(`2026-01-${(i + 1).toString().padStart(2, '0')}`, 50, 0, 0),
    );
    const result = calculateImprovement(matches);
    expect(result.checkoutImprovement).toBe(0);
  });
});
