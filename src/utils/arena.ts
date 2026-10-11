/**
 * Small derived facts for the game screen's spotlight (hero card and rows).
 */
import type { Throw } from '../types/index';
import { dartsInVisit } from './scoring';

/** The player's last `n` visits in the given throws, oldest first, newest last. */
export const lastVisits = (throws: Throw[], playerId: string, n: number): { score: number; bust: boolean }[] =>
  throws
    .filter(t => t.playerId === playerId)
    .slice(-n)
    .map(t => ({ score: t.isBust ? 0 : t.score, bust: !!t.isBust }));

/** Darts thrown in the leg (three per visit, the darts used on a checkout). */
export const dartsInLeg = (throws: Throw[], playerId: string): number =>
  throws.reduce((n, t) => (t.playerId === playerId ? n + dartsInVisit(t) : n), 0);
