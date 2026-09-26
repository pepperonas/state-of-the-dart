/**
 * Short vibration feedback for dart entry. Behind `settings.vibrationEnabled`
 * — that toggle existed for a long time without anything ever vibrating.
 * Silently does nothing where the Vibration API is missing (iOS Safari).
 */
export type HapticKind = 'dart' | 'confirm' | 'bust' | 'checkout';

export const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  dart: 8,
  confirm: 18,
  bust: [40, 60, 40],
  checkout: [30, 40, 30, 40, 120],
};

export const haptic = (kind: HapticKind, enabled: boolean): void => {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    // Some browsers throw when vibration is blocked by policy.
  }
};
