import { describe, it, expect } from 'vitest';
import {
  toDate,
  toDateOrNow,
  toTimestamp,
  toTimestampOrNow,
  formatDate,
  formatDateTime,
  formatDateShort,
  getTimestampForSort,
} from '../../utils/dateUtils';

describe('DateUtils', () => {
  describe('toDate', () => {
    it('should return null for null input', () => {
      expect(toDate(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(toDate(undefined)).toBeNull();
    });

    it('should return Date for valid Date object', () => {
      const date = new Date('2026-01-31T12:00:00Z');
      const result = toDate(date);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(date.getTime());
    });

    it('should return null for invalid Date object', () => {
      const invalidDate = new Date('invalid');
      expect(toDate(invalidDate)).toBeNull();
    });

    it('should convert Unix timestamp (milliseconds) to Date', () => {
      const timestamp = 1738310400000; // 2025-01-31 12:00:00 UTC
      const result = toDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(timestamp);
    });

    it('should convert Unix timestamp (seconds) to Date', () => {
      const timestampSeconds = 1738310400; // 2025-01-31 12:00:00 UTC
      const result = toDate(timestampSeconds);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(timestampSeconds * 1000);
    });

    it('should convert ISO string to Date', () => {
      const isoString = '2026-01-31T12:00:00.000Z';
      const result = toDate(isoString);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(isoString);
    });

    it('should return null for invalid string', () => {
      expect(toDate('invalid-date')).toBeNull();
    });

    it('should return null for non-date types', () => {
      expect(toDate({})).toBeNull();
      expect(toDate([])).toBeNull();
      expect(toDate(true)).toBeNull();
    });
  });

  describe('toDateOrNow', () => {
    it('should return Date for valid input', () => {
      const timestamp = 1738310400000;
      const result = toDateOrNow(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('should return current date for null input', () => {
      const before = Date.now();
      const result = toDateOrNow(null);
      const after = Date.now();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('should return fallback date when provided and input is invalid', () => {
      const fallback = new Date('2020-01-01');
      const result = toDateOrNow(null, fallback);
      expect(result.getTime()).toBe(fallback.getTime());
    });
  });

  describe('toTimestamp', () => {
    it('should return timestamp for valid Date', () => {
      const date = new Date('2026-01-31T12:00:00Z');
      expect(toTimestamp(date)).toBe(date.getTime());
    });

    it('should return timestamp for valid timestamp input', () => {
      const timestamp = 1738310400000;
      expect(toTimestamp(timestamp)).toBe(timestamp);
    });

    it('should return null for invalid input', () => {
      expect(toTimestamp(null)).toBeNull();
      expect(toTimestamp(undefined)).toBeNull();
      expect(toTimestamp('invalid')).toBeNull();
    });
  });

  describe('toTimestampOrNow', () => {
    it('should return timestamp for valid input', () => {
      const timestamp = 1738310400000;
      expect(toTimestampOrNow(timestamp)).toBe(timestamp);
    });

    it('should return current timestamp for invalid input', () => {
      const before = Date.now();
      const result = toTimestampOrNow(null);
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('formatDate', () => {
    it('should format valid date in German locale', () => {
      const date = new Date('2026-01-31T12:00:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/31\.01\.2026/);
    });

    it('should return "-" for invalid input', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('invalid')).toBe('-');
    });

    it('should format timestamp correctly', () => {
      const timestamp = 1738310400000;
      const result = formatDate(timestamp);
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2026-01-31T14:30:00Z');
      const result = formatDateTime(date);
      // Should include both date and time
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should return "-" for invalid input', () => {
      expect(formatDateTime(null)).toBe('-');
    });
  });

  describe('formatDateShort', () => {
    it('should format date in short format', () => {
      const date = new Date('2026-01-31T12:00:00Z');
      const result = formatDateShort(date);
      expect(result).toMatch(/31\.01/);
    });

    it('should return "-" for invalid input', () => {
      expect(formatDateShort(null)).toBe('-');
    });
  });

  describe('getTimestampForSort', () => {
    it('should return timestamp for valid input', () => {
      const timestamp = 1738310400000;
      expect(getTimestampForSort(timestamp)).toBe(timestamp);
    });

    it('should return 0 for invalid input', () => {
      expect(getTimestampForSort(null)).toBe(0);
      expect(getTimestampForSort(undefined)).toBe(0);
      expect(getTimestampForSort('invalid')).toBe(0);
    });

    it('should enable correct sorting', () => {
      const dates = [
        new Date('2026-01-15'),
        null,
        new Date('2026-01-31'),
        new Date('2026-01-01'),
      ];
      
      const sorted = [...dates].sort((a, b) => 
        getTimestampForSort(a) - getTimestampForSort(b)
      );
      
      // null (0) should be first, then chronological order
      expect(sorted[0]).toBeNull();
      expect(sorted[1]?.getDate()).toBe(1);
      expect(sorted[2]?.getDate()).toBe(15);
      expect(sorted[3]?.getDate()).toBe(31);
    });
  });
});
