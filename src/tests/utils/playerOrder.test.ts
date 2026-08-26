import { describe, it, expect } from 'vitest';
import { sortPlayers, comparePlayers, playerTier, isGeneratedPlayer } from '../../utils/playerOrder';
import type { Player } from '../../types/index';

/** Minimal player; only the fields the ordering rule reads actually matter. */
const mk = (name: string, gamesPlayed: number, extra: Partial<Player> = {}): Player =>
  ({
    id: name,
    name,
    avatar: '🎯',
    createdAt: new Date(),
    stats: { gamesPlayed } as Player['stats'],
    preferences: {} as Player['preferences'],
    ...extra,
  }) as Player;

const names = (list: Player[]) => sortPlayers(list).map((p) => p.name);

describe('player ordering', () => {
  it('puts real accounts above bots', () => {
    const list = [mk('Bot Alpha', 500, { isBot: true }), mk('Martin', 1)];
    expect(names(list)).toEqual(['Martin', 'Bot Alpha']);
  });

  it('puts real accounts above generated guest profiles', () => {
    const list = [mk('Guest 417', 900), mk('Martin', 1)];
    expect(names(list)).toEqual(['Martin', 'Guest 417']);
  });

  /** The headline rule: whoever plays most is at the top. */
  it('sorts by games played, most first', () => {
    const list = [mk('Anna', 3), mk('Bea', 40), mk('Cem', 12)];
    expect(names(list)).toEqual(['Bea', 'Cem', 'Anna']);
  });

  it('applies the games-played rule inside the bot/test group too', () => {
    const list = [
      mk('Bot Rookie', 2, { isBot: true }),
      mk('Guest 417', 30),
      mk('Bot Pro', 9, { isBot: true }),
      mk('Martin', 1),
    ];
    expect(names(list)).toEqual(['Martin', 'Guest 417', 'Bot Pro', 'Bot Rookie']);
  });

  /**
   * Without a final tiebreak the order of equal-scoring players depends on the
   * order the API happened to return them, so the list would reshuffle itself
   * between loads.
   */
  it('breaks ties by name so the order is stable', () => {
    expect(names([mk('Zoe', 5), mk('Adam', 5)])).toEqual(['Adam', 'Zoe']);
    expect(names([mk('Adam', 5), mk('Zoe', 5)])).toEqual(['Adam', 'Zoe']);
  });

  it('treats a player with no stats as having played nothing', () => {
    const noStats = { id: 'x', name: 'Neu', avatar: '🎯', createdAt: new Date() } as unknown as Player;
    expect(names([noStats, mk('Alt', 4)])).toEqual(['Alt', 'Neu']);
  });

  it('does not mutate the array it is given', () => {
    const list = [mk('Bot', 9, { isBot: true }), mk('Martin', 1)];
    const before = list.map((p) => p.name);
    sortPlayers(list);
    expect(list.map((p) => p.name)).toEqual(before);
  });

  describe('recognising generated profiles', () => {
    it('matches what the app and the test scripts actually create', () => {
      for (const n of ['Guest 417', 'guest 1', 'E2E Test User', 'Test Player', 'Demo User']) {
        expect(isGeneratedPlayer({ name: n }), n).toBe(true);
      }
    });

    /**
     * Name matching must anchor at the start. A person called "Gusti" or
     * "Testarossa" is a real player and must not be demoted.
     */
    it('does not demote real names that merely contain the words', () => {
      for (const n of ['Tom "Guest" Weber', 'Contest Winner', 'Protester', 'Demonstration Dave']) {
        expect(isGeneratedPlayer({ name: n }), n).toBe(false);
      }
    });

    it('tiers bots and generated profiles together, below accounts', () => {
      expect(playerTier({ name: 'Martin', isBot: false })).toBe(0);
      expect(playerTier({ name: 'Bot 1', isBot: true })).toBe(1);
      expect(playerTier({ name: 'Guest 12', isBot: false })).toBe(1);
    });
  });

  it('comparePlayers is a consistent comparator', () => {
    const a = mk('Anna', 10), b = mk('Bea', 5);
    expect(Math.sign(comparePlayers(a, b))).toBe(-Math.sign(comparePlayers(b, a)));
    expect(comparePlayers(a, a)).toBe(0);
  });
});
