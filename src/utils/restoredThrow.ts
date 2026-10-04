import type { Dart } from '../types/index';

/**
 * Darts of an unconfirmed visit read back from localStorage after a refresh.
 * Anything that is not a dart that could have been thrown is dropped, as is a
 * list of more than three.
 */
export const sanitizeRestoredThrow = (value: unknown): Dart[] => {
  if (!Array.isArray(value) || value.length > 3) return [];
  const valid = (d: unknown): d is Dart => {
    if (!d || typeof d !== 'object') return false;
    const { segment, multiplier, score } = d as Dart;
    if (segment === 0) return multiplier === 0 && score === 0;
    if (segment === 50) return multiplier === 2 && score === 50;
    if (segment === 25) return (multiplier === 1 && score === 25) || (multiplier === 2 && score === 50);
    return Number.isInteger(segment) && segment >= 1 && segment <= 20
      && (multiplier === 1 || multiplier === 2 || multiplier === 3) && score === segment * multiplier;
  };
  return value.every(valid) ? (value as Dart[]) : [];
};

