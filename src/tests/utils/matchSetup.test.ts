import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_GAME_SETTINGS, findReusableGuest, loadLastGameSettings, rotateForRematch, saveLastGameSettings, standings,
} from '../../utils/matchSetup';
import type { Match } from '../../types/index';

beforeEach(() => localStorage.clear());

describe('game settings memory', () => {
  it('a new device starts with 501 double out', () => {
    expect(loadLastGameSettings()).toMatchObject({ startScore: 501, doubleOut: true, doubleIn: false });
  });

  it('remembers the last settings', () => {
    saveLastGameSettings({ ...DEFAULT_GAME_SETTINGS, startScore: 301, legsToWin: 5, doubleOut: false });
    expect(loadLastGameSettings()).toMatchObject({ startScore: 301, legsToWin: 5, doubleOut: false });
  });

  it('survives garbage in storage', () => {
    localStorage.setItem('sotd-last-game-settings', '{not json');
    expect(loadLastGameSettings()).toEqual(DEFAULT_GAME_SETTINGS);
  });
});

describe('rotateForRematch', () => {
  it('the second player throws first next time', () => {
    expect(rotateForRematch(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
    expect(rotateForRematch(['a'])).toEqual(['a']);
  });
});

describe('standings', () => {
  const p = (playerId: string, over: Record<string, number> = {}) => ({
    playerId, name: playerId, setsWon: 0, legsWon: 0, matchAverage: 50, matchHighestScore: 100,
    match180s: 0, match171Plus: 0, match140Plus: 0, match100Plus: 0, match60Plus: 0,
    checkoutAttempts: 0, checkoutsHit: 0, ...over,
  });
  const leg = (winner?: string) => ({ id: `l${Math.random()}`, throws: [], startedAt: new Date(), winner });

  it('puts the winner first and ranks the rest by legs, then average', () => {
    const match = {
      winner: 'c',
      players: [p('a', { matchAverage: 70 }), p('b', { matchAverage: 90 }), p('c')],
      legs: [leg('a'), leg('c'), leg('c'), leg('b'), leg('a')],
    } as unknown as Match;
    expect(standings(match).map(s => s.playerId)).toEqual(['c', 'a', 'b']);
  });

  it('counts legs over the whole match, not the per-set counter', () => {
    const match = { winner: 'a', players: [p('a', { legsWon: 0 }), p('b')], legs: [leg('a'), leg('a'), leg('b')] } as unknown as Match;
    expect(standings(match)[0].legsWon).toBe(2);
  });
});

describe('findReusableGuest', () => {
  const players = [
    { id: '1', name: 'Martin' },
    { id: '2', name: 'Guest 417' },
    { id: '3', name: 'Guest' },
    { id: '4', name: 'Guestbot', isBot: true },
  ];
  it('prefers the plain "Guest", falls back to a numbered one', () => {
    expect(findReusableGuest(players)?.id).toBe('3');
    expect(findReusableGuest(players.filter(p => p.id !== '3'))?.id).toBe('2');
  });
  it('never picks a real person, a bot, or someone already selected', () => {
    expect(findReusableGuest([{ id: '1', name: 'Tom "Guest" Weber' }])).toBeUndefined();
    expect(findReusableGuest(players, ['3', '2'])).toBeUndefined();
  });
});
