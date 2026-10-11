import { describe, it, expect } from 'vitest';
import { feedbackLevel, personalBestHits } from '../../utils/feedback';
import { shapePolygon } from '../../utils/shapes';

describe('feedbackLevel', () => {
  it('scales with the moment', () => {
    expect(feedbackLevel({ score: 45, bust: false, checkout: false })).toBe(1);
    expect(feedbackLevel({ score: 100, bust: false, checkout: false })).toBe(2);
    expect(feedbackLevel({ score: 140, bust: false, checkout: false })).toBe(2);
    expect(feedbackLevel({ score: 180, bust: false, checkout: false })).toBe(3);
    expect(feedbackLevel({ score: 121, bust: false, checkout: true })).toBe(3);
    expect(feedbackLevel({ score: 40, bust: false, checkout: true })).toBe(1);
  });

  it('a bust is its own kind, never a success', () => {
    expect(feedbackLevel({ score: 0, bust: true, checkout: false })).toBe('bust');
  });
});

describe('personalBestHits', () => {
  const bests = { highestScore: 140, shortestLeg: 18 };

  it('a visit above the best visit is a new best', () => {
    expect(personalBestHits(bests, { score: 171, legWonInDarts: null, startScore: 501 })).toEqual([{ kind: 'visit', value: 171 }]);
  });

  it('equal is not a new best', () => {
    expect(personalBestHits(bests, { score: 140, legWonInDarts: null, startScore: 501 })).toEqual([]);
  });

  it('a 501 leg in fewer darts is a new best leg; other start scores do not count', () => {
    expect(personalBestHits(bests, { score: 60, legWonInDarts: 15, startScore: 501 })).toEqual([{ kind: 'leg', value: 15 }]);
    expect(personalBestHits(bests, { score: 60, legWonInDarts: 9, startScore: 301 })).toEqual([]);
  });

  it('no baseline, no claim (nothing recorded yet is not a record)', () => {
    expect(personalBestHits({ highestScore: 0, shortestLeg: 0 }, { score: 180, legWonInDarts: 12, startScore: 501 })).toEqual([]);
  });
});

describe('burst shape', () => {
  it('has the same point count as the circle, so the two can morph', () => {
    const count = (p: string) => p.split(',').length;
    expect(count(shapePolygon('burst', 60))).toBe(count(shapePolygon('circle', 60)));
  });
});
