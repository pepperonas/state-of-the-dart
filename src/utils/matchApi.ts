import { Match, Throw } from '../types/index';
import { calculateFirst9Average, dartsInVisit } from './scoring';

const toMs = (value: Date | string | number | undefined | null): number | null => {
  if (value === undefined || value === null) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/** Average of the per-leg first-nine averages, over the legs the player threw in. */
const first9Of = (match: Match, playerId: string): number => {
  const perLeg = match.legs
    .map(leg => leg.throws.filter(t => t.playerId === playerId))
    .filter(throws => throws.length > 0)
    .map(throws => calculateFirst9Average(throws));
  if (perLeg.length === 0) return 0;
  return Math.round((perLeg.reduce((a, b) => a + b, 0) / perLeg.length) * 100) / 100;
};

const dartsOf = (throws: Throw[]): number => throws.reduce((sum, t) => sum + dartsInVisit(t), 0);

/**
 * The match as the API stores it.
 *
 * - `winner` and `completedAt` are always present, `null` when unset: PUT only
 *   writes the fields it receives, and `undefined` vanishes from JSON — so an
 *   undone end of match never cleared the winner in the database.
 * - Players carry `highestScore`, `dartsThrown` and `first9Average`, which the
 *   server reads and the client never sent (every match stored 0 for all three).
 * - All timestamps travel as epoch ms; the columns are INTEGER.
 */
export const toApiMatch = (match: Match) => ({
  id: match.id,
  gameType: match.type,
  status: match.status,
  settings: match.settings,
  startedAt: toMs(match.startedAt) ?? Date.now(),
  completedAt: toMs(match.completedAt),
  winner: match.winner ?? null,
  players: match.players.map(p => {
    const throws = match.legs.flatMap(l => l.throws.filter(t => t.playerId === p.playerId));
    return {
      ...p,
      highestScore: p.matchHighestScore,
      dartsThrown: dartsOf(throws),
      first9Average: first9Of(match, p.playerId),
    };
  }),
  legs: match.legs.map((leg, i) => ({
    ...leg,
    legNumber: i + 1,
    startedAt: toMs(leg.startedAt),
    completedAt: toMs(leg.completedAt),
    throws: leg.throws.map(t => ({ ...t, timestamp: toMs(t.timestamp) })),
  })),
});

export type ApiMatch = ReturnType<typeof toApiMatch>;

/**
 * Fingerprint of everything a save has to carry. The old key counted throws
 * only: an undo followed by a corrected visit had the same count, so the
 * correction was never saved.
 */
export const matchSaveKey = (match: Match, currentPlayerIndex: number): string =>
  JSON.stringify({
    id: match.id,
    status: match.status,
    currentLegIndex: match.currentLegIndex,
    currentPlayerIndex,
    players: match.players.map(p => p.playerId),
    legs: match.legs.map(l => [l.id, l.winner ?? null, l.throws.map(t => `${t.id}:${t.score}`)]),
  });
