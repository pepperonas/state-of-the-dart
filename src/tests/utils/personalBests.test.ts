import { describe, it, expect } from 'vitest';
import { createEmptyPersonalBests, updatePersonalBests } from '../../types/personalBests';

describe('createEmptyPersonalBests', () => {
  it('should create bests with the given playerId', () => {
    const bests = createEmptyPersonalBests('player-1');
    expect(bests.playerId).toBe('player-1');
  });

  it('should initialize all scoring records to 0', () => {
    const bests = createEmptyPersonalBests('p1');
    expect(bests.highestScore.value).toBe(0);
    expect(bests.bestAverage.value).toBe(0);
    expect(bests.most180s.value).toBe(0);
    expect(bests.highestCheckout.value).toBe(0);
    expect(bests.bestCheckoutRate.value).toBe(0);
  });

  it('should initialize shortestLeg to 999', () => {
    const bests = createEmptyPersonalBests('p1');
    expect(bests.shortestLeg.darts).toBe(999);
  });

  it('should initialize all career stats to 0', () => {
    const bests = createEmptyPersonalBests('p1');
    expect(bests.totalGamesPlayed).toBe(0);
    expect(bests.totalWins).toBe(0);
    expect(bests.totalLosses).toBe(0);
    expect(bests.totalLegsWon).toBe(0);
    expect(bests.totalLegsLost).toBe(0);
    expect(bests.total180s).toBe(0);
    expect(bests.totalCheckouts).toBe(0);
  });

  it('should not set firstGameDate or lastGameDate', () => {
    const bests = createEmptyPersonalBests('p1');
    expect(bests.firstGameDate).toBeUndefined();
    expect(bests.lastGameDate).toBeUndefined();
  });
});

describe('updatePersonalBests', () => {
  const baseMatchData = {
    matchAverage: 50,
    highestScore: 100,
    score180s: 1,
    checkoutsHit: 2,
    checkoutAttempts: 5,
    legsWon: 3,
    legsLost: 2,
    isWinner: true,
    gameId: 'game-1',
    gameDate: new Date('2026-01-15'),
    shortestLegDarts: 15,
  };

  it('should update highestScore when new value is higher', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, { ...baseMatchData, highestScore: 140 });
    expect(updated.highestScore.value).toBe(140);
    expect(updated.highestScore.gameId).toBe('game-1');
  });

  it('should NOT update highestScore when new value is lower', () => {
    const bests = createEmptyPersonalBests('p1');
    const first = updatePersonalBests(bests, { ...baseMatchData, highestScore: 140, gameId: 'game-1' });
    const second = updatePersonalBests(first, { ...baseMatchData, highestScore: 100, gameId: 'game-2' });
    expect(second.highestScore.value).toBe(140);
    expect(second.highestScore.gameId).toBe('game-1');
  });

  it('should update bestAverage when new value is higher', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, { ...baseMatchData, matchAverage: 85.5 });
    expect(updated.bestAverage.value).toBe(85.5);
  });

  it('should update most180s when new value is higher', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, { ...baseMatchData, score180s: 5 });
    expect(updated.most180s.value).toBe(5);
  });

  it('should update bestCheckoutRate when new rate is higher', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, {
      ...baseMatchData,
      checkoutsHit: 3,
      checkoutAttempts: 4,
    });
    expect(updated.bestCheckoutRate.value).toBe(75);
  });

  it('should NOT update bestCheckoutRate when checkoutAttempts is 0', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, {
      ...baseMatchData,
      checkoutsHit: 0,
      checkoutAttempts: 0,
    });
    expect(updated.bestCheckoutRate.value).toBe(0);
  });

  it('should update shortestLeg when fewer darts', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, { ...baseMatchData, shortestLegDarts: 12 });
    expect(updated.shortestLeg.darts).toBe(12);
  });

  it('should NOT update shortestLeg when shortestLegDarts is undefined', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, {
      ...baseMatchData,
      shortestLegDarts: undefined,
    });
    expect(updated.shortestLeg.darts).toBe(999);
  });

  it('should increment career stats cumulatively', () => {
    const bests = createEmptyPersonalBests('p1');
    const first = updatePersonalBests(bests, baseMatchData);
    const second = updatePersonalBests(first, {
      ...baseMatchData,
      legsWon: 2,
      legsLost: 3,
      score180s: 2,
      checkoutsHit: 1,
      isWinner: false,
      gameId: 'game-2',
    });

    expect(second.totalGamesPlayed).toBe(2);
    expect(second.totalWins).toBe(1);
    expect(second.totalLosses).toBe(1);
    expect(second.totalLegsWon).toBe(5); // 3 + 2
    expect(second.totalLegsLost).toBe(5); // 2 + 3
    expect(second.total180s).toBe(3); // 1 + 2
    expect(second.totalCheckouts).toBe(3); // 2 + 1
  });

  it('should set firstGameDate only once', () => {
    const bests = createEmptyPersonalBests('p1');
    const first = updatePersonalBests(bests, {
      ...baseMatchData,
      gameDate: new Date('2026-01-10'),
    });
    const second = updatePersonalBests(first, {
      ...baseMatchData,
      gameDate: new Date('2026-02-20'),
    });
    expect(second.firstGameDate).toEqual(new Date('2026-01-10'));
  });

  it('should always update lastGameDate', () => {
    const bests = createEmptyPersonalBests('p1');
    const first = updatePersonalBests(bests, {
      ...baseMatchData,
      gameDate: new Date('2026-01-10'),
    });
    const second = updatePersonalBests(first, {
      ...baseMatchData,
      gameDate: new Date('2026-02-20'),
    });
    expect(second.lastGameDate).toEqual(new Date('2026-02-20'));
  });

  it('should count a loss when isWinner is false', () => {
    const bests = createEmptyPersonalBests('p1');
    const updated = updatePersonalBests(bests, { ...baseMatchData, isWinner: false });
    expect(updated.totalWins).toBe(0);
    expect(updated.totalLosses).toBe(1);
  });

  it('should not mutate the original bests object', () => {
    const bests = createEmptyPersonalBests('p1');
    const original = { ...bests };
    updatePersonalBests(bests, baseMatchData);
    expect(bests.totalGamesPlayed).toBe(original.totalGamesPlayed);
  });
});
