import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The saved-game restore used to run once on mount, while PlayerContext was
 * still loading and `players` was []. Every saved player then looked deleted
 * and the saved game was cleared — on every reload.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'de' } }),
}));
vi.mock('../../utils/celebration', () => ({ celebrate: vi.fn() }));
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ settings: { soundVolume: 0 } }),
}));

const roster = [
  { id: 'a', name: 'Alice', avatar: 'target', stats: {} },
  { id: 'b', name: 'Bob', avatar: 'target', stats: {} },
];
let playerState = { players: [] as typeof roster, loading: true };
vi.mock('../../context/PlayerContext', () => ({
  usePlayer: () => playerState,
}));

import AroundTheClockGame from '../../components/game/AroundTheClockGame';
import ShanghaiGame from '../../components/game/ShanghaiGame';
import CricketGame from '../../components/game/CricketGame';
import { STORAGE_KEYS } from '../../utils/gameStorage';

const savedPlayers = roster.map(({ id, name, avatar }) => ({ id, name, avatar }));
const saves = {
  [STORAGE_KEYS.ATC]: {
    gameType: 'around-the-clock', selectedPlayers: savedPlayers, bullMode: 'off', direction: 'ascending',
    variant: 'standard', currentPlayerIndex: 1, playerProgress: { a: 4, b: 2 }, playerDarts: { a: 9, b: 6 },
    playerHits: { a: 3, b: 1 }, turnHistory: [], elapsedTime: 30, savedAt: Date.now(),
  },
  [STORAGE_KEYS.SHANGHAI]: {
    gameType: 'shanghai', selectedPlayers: savedPlayers, startNumber: 1, rounds: 7, currentRound: 2,
    currentPlayerIndex: 0, playerScores: { a: 10, b: 4 }, roundScores: { a: {}, b: {} }, turnHistory: [],
    elapsedTime: 30, savedAt: Date.now(),
  },
  [STORAGE_KEYS.CRICKET]: {
    gameType: 'cricket', selectedPlayers: savedPlayers, currentPlayerIndex: 1, savedAt: Date.now(),
    cricketState: {
      a: { '20': 2, '19': 0, '18': 0, '17': 0, '16': 0, '15': 0, '25': 0, points: 0 },
      b: { '20': 0, '19': 0, '18': 0, '17': 0, '16': 0, '15': 0, '25': 0, points: 0 },
    },
  },
};

const cases: Array<[string, string, React.FC]> = [
  ['Around the Clock', STORAGE_KEYS.ATC, AroundTheClockGame],
  ['Shanghai', STORAGE_KEYS.SHANGHAI, ShanghaiGame],
  ['Cricket', STORAGE_KEYS.CRICKET, CricketGame as React.FC],
];

beforeEach(() => {
  localStorage.clear();
  playerState = { players: [], loading: true };
});

describe.each(cases)('%s — restoring a saved game', (_name, key, Game) => {
  it('keeps the save while the players are still loading, and restores it afterwards', () => {
    localStorage.setItem(key, JSON.stringify(saves[key]));
    const view = render(<MemoryRouter><Game /></MemoryRouter>);
    expect(localStorage.getItem(key)).not.toBeNull();

    playerState = { players: roster, loading: false };
    act(() => { view.rerender(<MemoryRouter><Game /></MemoryRouter>); });
    expect(localStorage.getItem(key)).not.toBeNull();
    // The game screen replaced the setup: both saved players are on the board.
    expect(view.container.textContent).toContain('Alice');
    expect(view.container.textContent).toContain('Bob');
  });

  it('still discards a save whose players really are gone', () => {
    localStorage.setItem(key, JSON.stringify(saves[key]));
    playerState = { players: [{ ...roster[0], id: 'someone-else' }], loading: false };
    render(<MemoryRouter><Game /></MemoryRouter>);
    expect(localStorage.getItem(key)).toBeNull();
  });
});
