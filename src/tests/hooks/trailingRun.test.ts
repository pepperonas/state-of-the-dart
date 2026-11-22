import { describe, it, expect } from 'vitest';
import { trailingRun } from '../../hooks/useGameAchievements';

/** Streaks come from the match's visits, so an undone visit leaves the streak (0.49.3). */
describe('trailingRun', () => {
  it('counts the run ending with the current visit', () => {
    expect(trailingRun([], 60, 60)).toBe(1);
    expect(trailingRun([60, 100, 81], 60, 60)).toBe(4);
    expect(trailingRun([60, 45, 100], 60, 60)).toBe(2);
    expect(trailingRun([60, 100], 59, 60)).toBe(0);
  });
  it('a bust (0) breaks the run', () => {
    expect(trailingRun([100, 0, 60], 60, 60)).toBe(2);
  });
});
