/**
 * Short vibration feedback for dart entry. Behind `settings.vibrationEnabled`
 * — that toggle existed for a long time without anything ever vibrating.
 * Silently does nothing where the Vibration API is missing (iOS Safari).
 */
export type HapticKind = 'dart' | 'confirm' | 'bust' | 'checkout' | 'ton' | 'hero' | 'undo' | 'leg' | 'match';

/**
 * One pattern per moment, growing with it (the feedback ladder). A success
 * and a failure never share a pattern: the bust is a double knock, every
 * success rises.
 */
export const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  dart: 8,
  confirm: 18,
  bust: [40, 60, 40],
  checkout: [30, 40, 30, 40, 120],
  ton: [18, 40, 28],
  hero: [24, 40, 36, 40, 60, 40, 140],
  undo: [10, 30, 10],
  leg: [40, 50, 60, 50, 160],
  match: [60, 60, 80, 60, 120, 60, 240],
};

export const haptic = (kind: HapticKind, enabled: boolean): void => {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    // Some browsers throw when vibration is blocked by policy.
  }
};
