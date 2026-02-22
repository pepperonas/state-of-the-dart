import { describe, it, expect } from 'vitest';
import {
  calculateDartScore,
  parseDartNotation,
  formatDartNotation,
  calculateAverage,
  calculateFirst9Average,
  isCheckout,
  validateScore,
  getScoreCategory,
  isBogeyNumber,
  getBogeyNumbers,
  isNineDarter,
  calculateDartsForLeg,
} from '../../utils/scoring';
import { Dart, Throw, Leg } from '../../types';

// Helper to create a Throw object
const makeThrow = (darts: Dart[], playerId = 'p1'): Throw => ({
  id: 'throw-1',
  playerId,
  darts,
  score: darts.reduce((s, d) => s + d.score, 0),
  remaining: 501,
  timestamp: new Date(),
  visitNumber: 1,
});

describe('calculateDartScore', () => {
  it('should return 0 for a miss (multiplier 0)', () => {
    expect(calculateDartScore(20, 0)).toBe(0);
  });

  it('should calculate single segment correctly', () => {
    expect(calculateDartScore(20, 1)).toBe(20);
    expect(calculateDartScore(5, 1)).toBe(5);
    expect(calculateDartScore(1, 1)).toBe(1);
  });

  it('should calculate double segment correctly', () => {
    expect(calculateDartScore(20, 2)).toBe(40);
    expect(calculateDartScore(16, 2)).toBe(32);
  });

  it('should calculate triple segment correctly', () => {
    expect(calculateDartScore(20, 3)).toBe(60);
    expect(calculateDartScore(19, 3)).toBe(57);
  });

  it('should handle outer bull (25, multiplier 1) → 25', () => {
    expect(calculateDartScore(25, 1)).toBe(25);
  });

  it('should handle bull (25, multiplier 2) → 50', () => {
    expect(calculateDartScore(25, 2)).toBe(50);
  });

  it('should handle segment 50 → 50', () => {
    expect(calculateDartScore(50, 1)).toBe(50);
    expect(calculateDartScore(50, 2)).toBe(50);
  });
});

describe('parseDartNotation', () => {
  it('should parse triple notation (T20)', () => {
    const dart = parseDartNotation('T20');
    expect(dart.segment).toBe(20);
    expect(dart.multiplier).toBe(3);
    expect(dart.score).toBe(60);
    expect(dart.bed).toBe('triple');
  });

  it('should parse double notation (D16)', () => {
    const dart = parseDartNotation('D16');
    expect(dart.segment).toBe(16);
    expect(dart.multiplier).toBe(2);
    expect(dart.score).toBe(32);
    expect(dart.bed).toBe('double');
  });

  it('should parse single notation (S5)', () => {
    const dart = parseDartNotation('S5');
    expect(dart.segment).toBe(5);
    expect(dart.multiplier).toBe(1);
    expect(dart.score).toBe(5);
    expect(dart.bed).toBe('single');
  });

  it('should parse bull notation', () => {
    expect(parseDartNotation('BULL').score).toBe(50);
    expect(parseDartNotation('DB').score).toBe(50);
    expect(parseDartNotation('B').score).toBe(50);
    expect(parseDartNotation('50').score).toBe(50);
  });

  it('should parse outer bull notation', () => {
    expect(parseDartNotation('OB').score).toBe(25);
    expect(parseDartNotation('25').score).toBe(25);
    expect(parseDartNotation('SB').score).toBe(25);
  });

  it('should parse miss notation', () => {
    const miss = parseDartNotation('M');
    expect(miss.score).toBe(0);
    expect(miss.multiplier).toBe(0);
    expect(miss.bed).toBe('miss');

    expect(parseDartNotation('MISS').score).toBe(0);
    expect(parseDartNotation('0').score).toBe(0);
  });

  it('should parse bare numbers as single', () => {
    const dart = parseDartNotation('7');
    expect(dart.segment).toBe(7);
    expect(dart.multiplier).toBe(1);
    expect(dart.score).toBe(7);
    expect(dart.bed).toBe('single');
  });

  it('should be case-insensitive', () => {
    expect(parseDartNotation('t20').score).toBe(60);
    expect(parseDartNotation('d16').score).toBe(32);
    expect(parseDartNotation('bull').score).toBe(50);
  });

  it('should throw on invalid segment number', () => {
    expect(() => parseDartNotation('T21')).toThrow('Invalid segment');
    expect(() => parseDartNotation('D0')).toThrow('Invalid segment');
  });

  it('should throw on invalid notation', () => {
    expect(() => parseDartNotation('X5')).toThrow('Invalid dart notation');
    expect(() => parseDartNotation('abc')).toThrow('Invalid dart notation');
  });
});

describe('formatDartNotation', () => {
  it('should format a miss as M', () => {
    expect(formatDartNotation({ segment: 0, multiplier: 0, score: 0 })).toBe('M');
  });

  it('should format bull as Bull', () => {
    expect(formatDartNotation({ segment: 50, multiplier: 2, score: 50 })).toBe('Bull');
  });

  it('should format outer bull as OB', () => {
    expect(formatDartNotation({ segment: 25, multiplier: 1, score: 25 })).toBe('OB');
  });

  it('should format triple', () => {
    expect(formatDartNotation({ segment: 20, multiplier: 3, score: 60 })).toBe('T20');
  });

  it('should format double', () => {
    expect(formatDartNotation({ segment: 16, multiplier: 2, score: 32 })).toBe('D16');
  });

  it('should format single', () => {
    expect(formatDartNotation({ segment: 5, multiplier: 1, score: 5 })).toBe('S5');
  });

  it('should roundtrip with parseDartNotation for standard notations', () => {
    const notations = ['T20', 'D16', 'S5', 'M'];
    for (const n of notations) {
      const dart = parseDartNotation(n);
      expect(formatDartNotation(dart)).toBe(n);
    }
  });
});

describe('calculateAverage', () => {
  it('should return 0 for empty throws', () => {
    expect(calculateAverage([])).toBe(0);
  });

  it('should calculate PPD average (score / darts * 3)', () => {
    const throws: Throw[] = [
      makeThrow([
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ]),
    ];
    // 180 / 3 darts * 3 = 180
    expect(calculateAverage(throws)).toBe(180);
  });

  it('should handle multiple throws', () => {
    const throws: Throw[] = [
      makeThrow([
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
      ]),
      makeThrow([
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
      ]),
    ];
    // 120 / 6 darts * 3 = 60
    expect(calculateAverage(throws)).toBe(60);
  });

  it('should handle throws with fewer than 3 darts', () => {
    const throws: Throw[] = [
      makeThrow([
        { segment: 20, multiplier: 2, score: 40 },
      ]),
    ];
    // 40 / 1 * 3 = 120
    expect(calculateAverage(throws)).toBe(120);
  });
});

describe('calculateFirst9Average', () => {
  it('should return 0 for empty throws', () => {
    expect(calculateFirst9Average([])).toBe(0);
  });

  it('should calculate average over first 9 darts', () => {
    const throws: Throw[] = [
      makeThrow([
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ]),
      makeThrow([
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ]),
      makeThrow([
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ]),
    ];
    // 540 / 9 * 3 = 180
    expect(calculateFirst9Average(throws)).toBe(180);
  });

  it('should stop at 9 darts even if more throws exist', () => {
    const throws: Throw[] = [
      makeThrow([
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ]),
      makeThrow([
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ]),
      makeThrow([
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ]),
      // This 4th throw should NOT be included
      makeThrow([
        { segment: 1, multiplier: 1, score: 1 },
        { segment: 1, multiplier: 1, score: 1 },
        { segment: 1, multiplier: 1, score: 1 },
      ]),
    ];
    expect(calculateFirst9Average(throws)).toBe(180);
  });

  it('should handle fewer than 9 darts', () => {
    const throws: Throw[] = [
      makeThrow([
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
      ]),
    ];
    // 60 / 3 * 3 = 60
    expect(calculateFirst9Average(throws)).toBe(60);
  });
});

describe('isCheckout', () => {
  it('should return true for valid double checkout', () => {
    const darts: Dart[] = [
      { segment: 20, multiplier: 3, score: 60 },
      { segment: 20, multiplier: 1, score: 20 },
      { segment: 10, multiplier: 2, score: 20 },
    ];
    expect(isCheckout(100, darts)).toBe(true);
  });

  it('should return true for bull checkout', () => {
    const darts: Dart[] = [
      { segment: 50, multiplier: 2, score: 50 },
    ];
    expect(isCheckout(50, darts)).toBe(true);
  });

  it('should return false when last dart is not a double', () => {
    const darts: Dart[] = [
      { segment: 20, multiplier: 3, score: 60 },
      { segment: 20, multiplier: 1, score: 20 },
      { segment: 20, multiplier: 1, score: 20 },
    ];
    expect(isCheckout(100, darts)).toBe(false);
  });

  it('should return false when score does not match remaining', () => {
    const darts: Dart[] = [
      { segment: 10, multiplier: 2, score: 20 },
    ];
    expect(isCheckout(50, darts)).toBe(false);
  });
});

describe('validateScore', () => {
  it('should accept valid scores', () => {
    expect(validateScore(0)).toBe(true);
    expect(validateScore(60)).toBe(true);
    expect(validateScore(100)).toBe(true);
    expect(validateScore(180)).toBe(true);
  });

  it('should reject negative scores', () => {
    expect(validateScore(-1)).toBe(false);
  });

  it('should reject scores above 180', () => {
    expect(validateScore(181)).toBe(false);
  });

  it('should reject impossible scores', () => {
    const impossible = [163, 166, 169, 172, 173, 175, 176, 178, 179];
    for (const score of impossible) {
      expect(validateScore(score)).toBe(false);
    }
  });

  it('should accept high but possible scores', () => {
    expect(validateScore(170)).toBe(true);
    expect(validateScore(171)).toBe(true);
    expect(validateScore(174)).toBe(true);
    expect(validateScore(177)).toBe(true);
  });
});

describe('getScoreCategory', () => {
  it('should return "180" for 180', () => {
    expect(getScoreCategory(180)).toBe('180');
  });

  it('should return "171+" for scores 171-179', () => {
    expect(getScoreCategory(171)).toBe('171+');
    expect(getScoreCategory(175)).toBe('171+');
  });

  it('should return "140+" for scores 140-170', () => {
    expect(getScoreCategory(140)).toBe('140+');
    expect(getScoreCategory(170)).toBe('140+');
  });

  it('should return "100+" for scores 100-139', () => {
    expect(getScoreCategory(100)).toBe('100+');
    expect(getScoreCategory(139)).toBe('100+');
  });

  it('should return "60+" for scores 60-99', () => {
    expect(getScoreCategory(60)).toBe('60+');
    expect(getScoreCategory(99)).toBe('60+');
  });

  it('should return null for scores below 60', () => {
    expect(getScoreCategory(59)).toBeNull();
    expect(getScoreCategory(0)).toBeNull();
  });
});

describe('isBogeyNumber / getBogeyNumbers', () => {
  it('should return true for all bogey numbers', () => {
    const bogeyNumbers = [169, 168, 166, 165, 163, 162, 159];
    for (const n of bogeyNumbers) {
      expect(isBogeyNumber(n)).toBe(true);
    }
  });

  it('should return false for non-bogey numbers', () => {
    expect(isBogeyNumber(170)).toBe(false);
    expect(isBogeyNumber(167)).toBe(false);
    expect(isBogeyNumber(100)).toBe(false);
    expect(isBogeyNumber(0)).toBe(false);
  });

  it('getBogeyNumbers should return the complete list', () => {
    const list = getBogeyNumbers();
    expect(list).toEqual([169, 168, 166, 165, 163, 162, 159]);
  });
});

describe('isNineDarter', () => {
  it('should return true for 9-dart leg in 501', () => {
    const leg: Leg = {
      id: 'leg-1',
      startedAt: new Date(),
      winner: 'p1',
      throws: [
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 19, multiplier: 3, score: 57 },
          { segment: 12, multiplier: 2, score: 24 },
        ]),
      ],
    };
    expect(isNineDarter(leg, 501)).toBe(true);
  });

  it('should return false if startScore is not 501', () => {
    const leg: Leg = {
      id: 'leg-1',
      startedAt: new Date(),
      winner: 'p1',
      throws: [
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
      ],
    };
    expect(isNineDarter(leg, 301)).toBe(false);
  });

  it('should return false if no winner', () => {
    const leg: Leg = {
      id: 'leg-1',
      startedAt: new Date(),
      throws: [
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 19, multiplier: 3, score: 57 },
          { segment: 12, multiplier: 2, score: 24 },
        ]),
      ],
    };
    expect(isNineDarter(leg, 501)).toBe(false);
  });

  it('should return false if more than 9 darts', () => {
    const leg: Leg = {
      id: 'leg-1',
      startedAt: new Date(),
      winner: 'p1',
      throws: [
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
        ]),
      ],
    };
    expect(isNineDarter(leg, 501)).toBe(false);
  });
});

describe('calculateDartsForLeg', () => {
  it('should count total darts across all throws', () => {
    const leg: Leg = {
      id: 'leg-1',
      startedAt: new Date(),
      throws: [
        makeThrow([
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
          { segment: 20, multiplier: 3, score: 60 },
        ]),
        makeThrow([
          { segment: 20, multiplier: 1, score: 20 },
          { segment: 20, multiplier: 2, score: 40 },
        ]),
      ],
    };
    expect(calculateDartsForLeg(leg)).toBe(5);
  });

  it('should return 0 for empty leg', () => {
    const leg: Leg = {
      id: 'leg-1',
      startedAt: new Date(),
      throws: [],
    };
    expect(calculateDartsForLeg(leg)).toBe(0);
  });
});
