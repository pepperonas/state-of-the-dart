import type { TFunction } from 'i18next';
import type { Match, Throw } from '../types';

const allThrows = (m: Match | null): Throw[] => (m ? m.legs.flatMap(l => l.throws) : []);

/**
 * What a screen reader should hear after a match update, or null for silence.
 *
 * Compares the previous and next match: a new visit is announced with its
 * score and what is left; a checkout names the leg or match winner; a visit
 * taken back says so. Pure, so it is tested without rendering the game.
 */
export function announcementFor(prev: Match | null, next: Match | null, t: TFunction): string | null {
  if (!next || !prev || prev.id !== next.id) return null;
  const before = allThrows(prev);
  const after = allThrows(next);
  const nameOf = (id: string) => next.players.find(p => p.playerId === id)?.name ?? '';

  if (after.length < before.length) {
    const last = after[after.length - 1];
    return last
      ? t('announce.undo_to', { name: nameOf(last.playerId), remaining: last.remaining })
      : t('announce.undo');
  }
  if (after.length === before.length) {
    // A corrected visit (same visits, one with a new score).
    const old = new Map(before.map(t => [t.id, t]));
    const changed = after.find(t => old.has(t.id) && old.get(t.id)!.score !== t.score);
    if (!changed) return null;
    const last = [...after].reverse().find(t => t.playerId === changed.playerId)!;
    return t('announce.corrected', { name: nameOf(changed.playerId), from: old.get(changed.id)!.score, to: changed.score, remaining: last.remaining });
  }

  const visit = after[after.length - 1];
  const name = nameOf(visit.playerId);
  if (next.winner && next.winner === visit.playerId && visit.remaining === 0) {
    return t('announce.match_won', { name, score: visit.score });
  }
  if (visit.remaining === 0 && !visit.isBust) {
    return t('announce.leg_won', { name, score: visit.score });
  }
  if (visit.isBust) return t('announce.bust', { name, remaining: visit.remaining });
  return t('announce.visit', { name, score: visit.score, remaining: visit.remaining });
}
