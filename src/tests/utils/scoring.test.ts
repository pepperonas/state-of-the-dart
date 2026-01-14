import { describe, it, expect } from 'vitest';
import { calculateThrowScore, isBust, convertScoreToDarts } from '../../utils/scoring';
import { Dart } from '../../types';

describe('Scoring Utils', () => {
  describe('calculateThrowScore', () => {
    it('should calculate score for single darts', () => {
      const darts: Dart[] = [
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
        { segment: 20, multiplier: 1, score: 20 },
      ];
      expect(calculateThrowScore(darts)).toBe(60);
    });

    it('should calculate score for triple 20', () => {
      const darts: Dart[] = [
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 20, multiplier: 3, score: 60 },
      ];
      expect(calculateThrowScore(darts)).toBe(180);
    });

    it('should return 0 for empty throw', () => {
      expect(calculateThrowScore([])).toBe(0);
    });

    it('should handle mixed scores', () => {
      const darts: Dart[] = [
        { segment: 20, multiplier: 3, score: 60 },
        { segment: 19, multiplier: 2, score: 38 },
        { segment: 1, multiplier: 1, score: 1 },
      ];
      expect(calculateThrowScore(darts)).toBe(99);
    });
  });

  describe('isBust', () => {
    it('should detect bust when score goes below 0', () => {
      expect(isBust(20, 30, false)).toBe(true);
    });

    it('should detect bust on double out without double', () => {
      const lastDart: Dart = { segment: 10, multiplier: 1, score: 10, bed: 'single' };
      expect(isBust(10, 10, true, lastDart)).toBe(true);
    });

    it('should not bust on valid double out', () => {
      const lastDart: Dart = { segment: 10, multiplier: 2, score: 20, bed: 'double' };
      expect(isBust(20, 20, true, lastDart)).toBe(false);
    });

    it('should not bust on valid score', () => {
      expect(isBust(100, 60, false)).toBe(false);
    });
  });

  describe('convertScoreToDarts', () => {
    it('should convert 180 to triple 20s', () => {
      const darts = convertScoreToDarts(180);
      expect(darts.length).toBeGreaterThan(0);
      expect(calculateThrowScore(darts)).toBe(180);
    });

    it('should convert 60 to valid darts', () => {
      const darts = convertScoreToDarts(60);
      expect(darts.length).toBeGreaterThan(0);
      expect(calculateThrowScore(darts)).toBe(60);
    });

    it('should convert 0 to miss', () => {
      const darts = convertScoreToDarts(0);
      expect(darts.length).toBe(1);
      expect(darts[0].score).toBe(0);
      expect(darts[0].segment).toBe(0);
      expect(darts[0].multiplier).toBe(0);
    });

    it('should handle scores > 180 by capping at 180', () => {
      const darts = convertScoreToDarts(200);
      expect(darts.length).toBeGreaterThan(0);
      const total = calculateThrowScore(darts);
      expect(total).toBeLessThanOrEqual(180);
    });
  });
});
