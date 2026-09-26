import { CricketState, Dart } from '../types/index';

/** 20, 19, 18, 17, 16, 15 and the bull. */
export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25];

export const emptyCricketState = (playerIds: string[]): CricketState =>
  Object.fromEntries(playerIds.map(id => [id, {
    '20': 0, '19': 0, '18': 0, '17': 0, '16': 0, '15': 0, '25': 0, points: 0,
  }]));

/**
 * Applies one visit and returns a NEW state.
 *
 * The component used to copy only the top level (`{ ...cricketState }`) and
 * then write into the per-player objects — mutating the previous state, which
 * is why a confirmed visit could never be taken back.
 */
export const applyCricketVisit = (
  state: CricketState,
  playerIds: string[],
  playerId: string,
  darts: Dart[],
): CricketState => {
  const next: CricketState = Object.fromEntries(
    Object.entries(state).map(([id, s]) => [id, { ...s }]),
  );
  const me = next[playerId];
  if (!me) return next;

  const opponentOpen = (num: string) =>
    playerIds.some(id => id !== playerId && (next[id]?.[num] || 0) < 3);

  for (const dart of darts) {
    if (!CRICKET_NUMBERS.includes(dart.segment) || dart.multiplier === 0) continue;
    const num = dart.segment.toString();
    const marks = me[num] || 0;
    const toClose = Math.max(0, 3 - marks);
    const closing = Math.min(dart.multiplier, toClose);
    const extra = dart.multiplier - closing;
    me[num] = marks + closing;
    if (extra > 0 && opponentOpen(num)) {
      me.points += extra * (dart.segment === 25 ? 25 : dart.segment);
    }
  }
  return next;
};

/** Every number closed and at least as many points as each opponent. */
export const isCricketWinner = (state: CricketState, playerIds: string[], playerId: string): boolean => {
  const me = state[playerId];
  if (!me) return false;
  const allClosed = CRICKET_NUMBERS.every(num => (me[num.toString()] || 0) >= 3);
  if (!allClosed) return false;
  return playerIds.every(id => id === playerId || me.points >= (state[id]?.points || 0));
};
