import type { Match, Throw } from '../types/index';
import { sanitizeRestoredThrow } from './restoredThrow';

/** Longer than any real "undo too many" — and a cap on what a broken entry can do. */
export const MAX_REDO = 200;

/**
 * The redo history read back from localStorage after a refresh (0.40.0 —
 * before, a reload silently dropped it). It is kept only if every visit could
 * come back: a player of this match, darts that could have been thrown, and an
 * id the match does not hold any more (an undone visit is, by definition, gone).
 * One bad entry drops the whole stack — half a history would redo the wrong
 * visits in the wrong order.
 */
export const sanitizeRestoredRedo = (value: unknown, match: Match): Throw[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_REDO) return [];
  const playerIds = new Set(match.players.map(p => p.playerId));
  const booked = new Set(match.legs.flatMap(l => l.throws.map(t => t.id)));
  const ok = value.every((t: unknown) => {
    if (!t || typeof t !== 'object') return false;
    const v = t as Throw;
    if (typeof v.id !== 'string' || booked.has(v.id) || !playerIds.has(v.playerId)) return false;
    return Array.isArray(v.darts) && v.darts.length >= 1 && sanitizeRestoredThrow(v.darts).length === v.darts.length;
  });
  return ok ? (value as Throw[]) : [];
};
