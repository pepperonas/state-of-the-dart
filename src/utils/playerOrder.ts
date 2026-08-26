import type { Player } from '../types/index';

/**
 * The one ordering rule for player lists.
 *
 * Every picker in the app maps over `players` from `PlayerContext`, and the API
 * returns them newest-first (`ORDER BY created_at DESC`). That put the throwaway
 * `Guest 417` profile the app creates for a quick game — and every bot ever
 * added — above the people who actually use it. The rule now is:
 *
 *   1. real player accounts before bots and test/guest profiles
 *   2. within a group, whoever has played the most games first
 *   3. name as the final tiebreak, so the order is stable rather than
 *      dependent on however the rows happen to arrive
 *
 * `sortPlayers` is applied once, in `PlayerContext`, so every list inherits it.
 */

/** Throwaway profiles the app (or a test run) generated, not people. */
const GENERATED_NAME = [
  /^guest\b/i, // `Guest 417`, created by GameScreen for a one-off game
  /^(e2e[\s-]*)?test(\s+(user|player|spieler))?\b/i,
  /^demo(\s+(user|player|spieler))?\b/i,
];

export function isGeneratedPlayer(player: Pick<Player, 'name'>): boolean {
  const name = (player.name ?? '').trim();
  return GENERATED_NAME.some((re) => re.test(name));
}

/** 0 = a real account, 1 = a bot or a generated test/guest profile. */
export function playerTier(player: Pick<Player, 'name' | 'isBot'>): 0 | 1 {
  return player.isBot || isGeneratedPlayer(player) ? 1 : 0;
}

const gamesPlayed = (player: Player): number => player.stats?.gamesPlayed ?? 0;

export function comparePlayers(a: Player, b: Player): number {
  const tier = playerTier(a) - playerTier(b);
  if (tier !== 0) return tier;

  const games = gamesPlayed(b) - gamesPlayed(a); // most played first
  if (games !== 0) return games;

  return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
}

/** Returns a new array — never sorts the caller's list in place. */
export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort(comparePlayers);
}
