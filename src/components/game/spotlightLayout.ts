import type { HeroSize } from './HeroCard';
import type { RowDensity } from './PlayerRow';

/** From this many players on, the rows tighten (0.45.0). */
export const DENSE_FROM = 5;

/**
 * How the rows beside the hero card are drawn. Up to four players a row is
 * roomy; from five on it tightens, and on a phone the rows become half-width
 * tiles in two columns — seven roomy rows alone were taller than the screen.
 */
export const rowDensity = (playerCount: number, size: HeroSize): RowDensity =>
  playerCount < DENSE_FROM ? 'regular' : size === 'compact' ? 'tile' : 'dense';

/** The player who throws after `currentId` (match order, wrapping). Nobody with fewer than three players — the other one is obvious. */
export const nextPlayerId = (ids: string[], currentId: string | undefined): string | undefined => {
  if (ids.length < 3 || currentId === undefined) return undefined;
  const i = ids.indexOf(currentId);
  if (i < 0) return undefined;
  return ids[(i + 1) % ids.length];
};
