import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEYS,
  saveGameState,
  loadGameState,
  clearGameState,
  getLocalGameSummaries,
  type ATCSavedState,
  type ShanghaiSavedState,
  type CricketSavedState,
} from '../../utils/gameStorage';
import type { CricketState } from '../../types/index';

const HOUR = 60 * 60 * 1000;

const atc = (over: Partial<ATCSavedState> = {}): ATCSavedState => ({
  gameType: 'around-the-clock',
  selectedPlayers: [{ id: 'p1', name: 'Anna' }, { id: 'p2', name: 'Ben' }],
  bullMode: 'off',
  direction: 'ascending',
  variant: 'standard',
  currentPlayerIndex: 0,
  playerProgress: { p1: 7, p2: 3 },
  playerDarts: { p1: 21, p2: 18 },
  playerHits: { p1: 7, p2: 3 },
  turnHistory: [],
  elapsedTime: 120,
  savedAt: Date.now(),
  ...over,
});

const shanghai = (over: Partial<ShanghaiSavedState> = {}): ShanghaiSavedState => ({
  gameType: 'shanghai',
  selectedPlayers: [{ id: 'p1', name: 'Anna' }],
  startNumber: 1,
  rounds: 7,
  currentRound: 2,
  currentPlayerIndex: 0,
  playerScores: { p1: 40 },
  roundScores: { p1: { 1: 20, 2: 20 } },
  turnHistory: [],
  savedAt: Date.now(),
  ...over,
});

const cricket = (over: Partial<CricketSavedState> = {}): CricketSavedState => ({
  gameType: 'cricket',
  selectedPlayers: [{ id: 'p1', name: 'Anna' }],
  cricketState: {} as CricketState,
  currentPlayerIndex: 0,
  savedAt: Date.now(),
  ...over,
});

describe('gameStorage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a saved game', () => {
    saveGameState(STORAGE_KEYS.ATC, atc());
    const back = loadGameState<ATCSavedState>(STORAGE_KEYS.ATC);
    expect(back?.gameType).toBe('around-the-clock');
    expect(back?.playerProgress).toEqual({ p1: 7, p2: 3 });
  });

  it('returns null for a key that was never written', () => {
    expect(loadGameState(STORAGE_KEYS.SHANGHAI)).toBeNull();
  });

  it('clearGameState removes only its own key', () => {
    saveGameState(STORAGE_KEYS.ATC, atc());
    saveGameState(STORAGE_KEYS.SHANGHAI, shanghai());
    clearGameState(STORAGE_KEYS.ATC);
    expect(loadGameState(STORAGE_KEYS.ATC)).toBeNull();
    expect(loadGameState(STORAGE_KEYS.SHANGHAI)).not.toBeNull();
  });

  describe('the 48-hour staleness rule', () => {
    it('keeps a game saved just inside the window', () => {
      saveGameState(STORAGE_KEYS.ATC, atc({ savedAt: Date.now() - 47 * HOUR }));
      expect(loadGameState(STORAGE_KEYS.ATC)).not.toBeNull();
    });

    it('drops a game past the window', () => {
      saveGameState(STORAGE_KEYS.ATC, atc({ savedAt: Date.now() - 49 * HOUR }));
      expect(loadGameState(STORAGE_KEYS.ATC)).toBeNull();
    });

    /** A stale entry is deleted, not just hidden — otherwise it lingers forever. */
    it('deletes the stale entry rather than only hiding it', () => {
      saveGameState(STORAGE_KEYS.ATC, atc({ savedAt: Date.now() - 100 * HOUR }));
      loadGameState(STORAGE_KEYS.ATC);
      expect(localStorage.getItem(STORAGE_KEYS.ATC)).toBeNull();
    });
  });

  /** A half-written entry must not wedge the resume screen on every load. */
  it('discards corrupt JSON instead of throwing', () => {
    localStorage.setItem(STORAGE_KEYS.CRICKET, '{ not json');
    expect(() => loadGameState(STORAGE_KEYS.CRICKET)).not.toThrow();
    expect(loadGameState(STORAGE_KEYS.CRICKET)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.CRICKET)).toBeNull();
  });

  describe('summaries for the resume screen', () => {
    it('is empty when nothing is stored', () => {
      expect(getLocalGameSummaries()).toEqual([]);
    });

    it('lists every stored game with its route and players', () => {
      saveGameState(STORAGE_KEYS.ATC, atc());
      saveGameState(STORAGE_KEYS.SHANGHAI, shanghai());
      saveGameState(STORAGE_KEYS.CRICKET, cricket());
      const s = getLocalGameSummaries();
      expect(s.map((x) => x.gameType)).toEqual(['around-the-clock', 'shanghai', 'cricket']);
      expect(s.map((x) => x.route)).toEqual(['/around-the-clock', '/shanghai', '/cricket']);
      expect(s[0].players).toEqual(['Anna', 'Ben']);
    });

    it('omits stale games', () => {
      saveGameState(STORAGE_KEYS.ATC, atc({ savedAt: Date.now() - 72 * HOUR }));
      saveGameState(STORAGE_KEYS.SHANGHAI, shanghai());
      expect(getLocalGameSummaries().map((x) => x.gameType)).toEqual(['shanghai']);
    });

    /** Bull mode changes how many targets a round has, so it changes the progress text. */
    it('counts the bull into the ATC target total', () => {
      saveGameState(STORAGE_KEYS.ATC, atc({ bullMode: 'off' }));
      expect(getLocalGameSummaries()[0].progressText).toBe('7/20');
      saveGameState(STORAGE_KEYS.ATC, atc({ bullMode: 'standard' }));
      expect(getLocalGameSummaries()[0].progressText).toBe('7/21');
      saveGameState(STORAGE_KEYS.ATC, atc({ bullMode: 'split' }));
      expect(getLocalGameSummaries()[0].progressText).toBe('7/22');
    });

    it('reports Shanghai progress as a 1-based round', () => {
      saveGameState(STORAGE_KEYS.SHANGHAI, shanghai({ currentRound: 2, rounds: 7 }));
      expect(getLocalGameSummaries()[0].progressText).toBe('3/7');
    });
  });
});
