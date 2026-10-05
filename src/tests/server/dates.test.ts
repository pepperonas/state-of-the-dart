import { describe, it, expect } from 'vitest';
import { localDateKey } from '../../../server/src/utils/dates';

describe('localDateKey', () => {
  it('names the local calendar day, not the UTC one', () => {
    // Local midnight: toISOString() would give the previous day east of UTC.
    expect(localDateKey(new Date(2026, 9, 5, 0, 0, 0))).toBe('2026-10-05');
    expect(localDateKey(new Date(2026, 9, 5, 23, 59, 59))).toBe('2026-10-05');
  });
  it('pads month and day', () => {
    expect(localDateKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});
