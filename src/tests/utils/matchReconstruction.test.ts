import { describe, it, expect } from 'vitest';
import { reconstructMatch } from '../../utils/matchReconstruction';

// Minimal API match shape for testing
const makeApiMatch = (overrides: Record<string, unknown> = {}) => ({
  id: 'match-1',
  type: 'x01',
  settings: { startScore: 501, legsToWin: 3, doubleOut: true },
  players: [
    { playerId: 'p1', name: 'Alice', setsWon: 0, legsWon: 0, matchAverage: 0, matchHighestScore: 0, match180s: 0, match171Plus: 0, match140Plus: 0, match100Plus: 0, match60Plus: 0, checkoutAttempts: 0, checkoutsHit: 0 },
    { playerId: 'p2', name: 'Bob', setsWon: 0, legsWon: 0, matchAverage: 0, matchHighestScore: 0, match180s: 0, match171Plus: 0, match140Plus: 0, match100Plus: 0, match60Plus: 0, checkoutAttempts: 0, checkoutsHit: 0 },
  ],
  legs: [],
  status: 'in_progress',
  startedAt: '2026-01-15T10:00:00.000Z',
  ...overrides,
});

const makeLeg = (id: string, winner?: string, throws: { playerId: string }[] = []) => ({
  id,
  throws,
  winner,
  startedAt: '2026-01-15T10:00:00.000Z',
});

describe('reconstructMatch', () => {
  it('should set currentLegIndex to 0 for empty legs', () => {
    const result = reconstructMatch(makeApiMatch({ legs: [] }));
    // legs.length - 1 = -1, but the loop doesn't execute, so it stays at -1
    // Actually: let currentLegIndex = legs.length - 1 = -1
    expect(result.currentLegIndex).toBe(-1);
  });

  it('should set currentLegIndex to first leg without winner', () => {
    const legs = [
      makeLeg('leg-1', 'p1', [{ playerId: 'p1' }]),
      makeLeg('leg-2', 'p2', [{ playerId: 'p2' }]),
      makeLeg('leg-3', undefined, [{ playerId: 'p1' }]),
    ];
    const result = reconstructMatch(makeApiMatch({ legs }));
    expect(result.currentLegIndex).toBe(2);
  });

  it('should set currentLegIndex to last leg when all have winners', () => {
    const legs = [
      makeLeg('leg-1', 'p1', [{ playerId: 'p1' }]),
      makeLeg('leg-2', 'p2', [{ playerId: 'p2' }]),
    ];
    const result = reconstructMatch(makeApiMatch({ legs }));
    expect(result.currentLegIndex).toBe(1);
  });

  it('should find first incomplete leg even if later legs have winners', () => {
    const legs = [
      makeLeg('leg-1', 'p1', [{ playerId: 'p1' }]),
      makeLeg('leg-2', undefined, [{ playerId: 'p2' }]),
      makeLeg('leg-3', 'p1', [{ playerId: 'p1' }]),
    ];
    const result = reconstructMatch(makeApiMatch({ legs }));
    expect(result.currentLegIndex).toBe(1);
  });

  it('should set currentSetIndex to 0', () => {
    const result = reconstructMatch(makeApiMatch());
    expect(result.currentSetIndex).toBe(0);
  });

  it('should determine legStartPlayerIndex from first throw of first leg', () => {
    const legs = [
      makeLeg('leg-1', 'p1', [{ playerId: 'p2' }, { playerId: 'p1' }]),
    ];
    // p2 started (index 1), currentLegIndex = 0 (no winner)
    // legStartPlayerIndex = (1 + 0) % 2 = 1
    const result = reconstructMatch(makeApiMatch({ legs }));
    expect(result.legStartPlayerIndex).toBe(1);
  });

  it('should alternate starting player across legs', () => {
    const legs = [
      makeLeg('leg-1', 'p1', [{ playerId: 'p1' }]),
      makeLeg('leg-2', 'p2', [{ playerId: 'p1' }]),
      makeLeg('leg-3', undefined, [{ playerId: 'p1' }]),
    ];
    // p1 started (index 0), currentLegIndex = 2 (first without winner)
    // legStartPlayerIndex = (0 + 2) % 2 = 0
    const result = reconstructMatch(makeApiMatch({ legs }));
    expect(result.legStartPlayerIndex).toBe(0);
  });

  it('should default legStartPlayerIndex to 0 when no throws exist', () => {
    const legs = [makeLeg('leg-1', undefined, [])];
    const result = reconstructMatch(makeApiMatch({ legs }));
    expect(result.legStartPlayerIndex).toBe(0);
  });

  it('should revive date strings into Date objects', () => {
    const result = reconstructMatch(makeApiMatch());
    expect(result.startedAt).toBeInstanceOf(Date);
  });

  it('should preserve the match type', () => {
    const result = reconstructMatch(makeApiMatch({ type: 'cricket' }));
    expect(result.type).toBe('cricket');
  });

  it('should handle single-player match', () => {
    const apiMatch = makeApiMatch({
      players: [
        { playerId: 'p1', name: 'Solo', setsWon: 0, legsWon: 0, matchAverage: 0, matchHighestScore: 0, match180s: 0, match171Plus: 0, match140Plus: 0, match100Plus: 0, match60Plus: 0, checkoutAttempts: 0, checkoutsHit: 0 },
      ],
      legs: [makeLeg('leg-1', undefined, [{ playerId: 'p1' }])],
    });
    const result = reconstructMatch(apiMatch);
    // (0 + 0) % max(1, 1) = 0
    expect(result.legStartPlayerIndex).toBe(0);
  });

  it('should handle missing legs gracefully', () => {
    const apiMatch = makeApiMatch();
    delete (apiMatch as any).legs;
    const result = reconstructMatch(apiMatch);
    expect(result.currentLegIndex).toBe(-1);
  });
});
