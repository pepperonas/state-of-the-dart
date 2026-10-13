import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/config';
import { createEmptyPersonalBests } from '../../types/personalBests';

/** 0.39.0 — achievements, leaderboard and player list, calmer. */
const players = [
  { id: 'a', name: 'Anna', avatar: 'trophy', stats: { gamesPlayed: 3, averageOverall: 60 } },
  { id: 'b', name: 'Ben', avatar: 'flame', stats: { gamesPlayed: 2, averageOverall: 50 } },
  { id: 'c', name: 'Cid', avatar: 'rocket', stats: { gamesPlayed: 1, averageOverall: 40 } },
  { id: 'd', name: 'Dan', avatar: 'star', stats: { gamesPlayed: 1, averageOverall: 30 } },
];
const pb = (id: string, avg: number) => {
  const p = createEmptyPersonalBests(id);
  p.totalGamesPlayed = 1;
  p.bestAverage = { ...p.bestAverage, value: avg };
  return p;
};
const bests = { a: pb('a', 90), b: pb('b', 80), c: pb('c', 70), d: pb('d', 60) };

vi.mock('../../context/PlayerContext', () => ({
  usePlayer: () => ({ players, loading: false, addPlayer: vi.fn(), deletePlayer: vi.fn(), updatePlayer: vi.fn() }),
}));
vi.mock('../../context/AchievementContext', async () => {
  const { ACHIEVEMENTS } = await vi.importActual<typeof import('../../types/achievements')>('../../types/achievements');
  return {
  useAchievements: () => ({
    getAllPlayerProgress: () => ({}),
    getPlayerProgress: () => ({ unlockedAchievements: [{ achievementId: 'first_game', unlockedAt: new Date() }], progress: {}, totalPoints: 10 }),
    getUnlockedAchievements: () => ACHIEVEMENTS.filter(a => a.id === 'first_game'),
    getLockedAchievements: () => [],
    isAchievementUnlocked: (_p: string, id: string) => id === 'first_game',
  }),
  };
});
vi.mock('../../context/TenantContext', () => ({
  useTenant: () => ({ storage: { get: (k: string, d: unknown) => (k === 'personalBests' ? bests : d), set: vi.fn() } }),
}));
vi.mock('../../services/api', () => ({
  api: { players: { getPersonalBests: () => Promise.reject(new Error('offline')) }, auth: { getMainPlayer: () => Promise.resolve({}) } },
  default: {},
}));
vi.mock('../../components/common/feedbackContext', () => ({ useFeedback: () => ({ notify: vi.fn(), confirm: vi.fn() }) }));

import AchievementsScreen from '../../components/achievements/AchievementsScreen';
import Leaderboard from '../../components/leaderboard/Leaderboard';
import PlayerManagement from '../../components/player/PlayerManagement';

const wrap = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>);

describe('achievement cards', () => {
  it('say the tier in words and rarity once, translated; the area chip is gone', () => {
    wrap(<AchievementsScreen />);
    const meta = screen.getAllByTestId('achievement-meta')[0];
    expect(meta).toHaveTextContent('Bronze');
    expect(meta).toHaveTextContent('Häufig');
    expect(meta).not.toHaveTextContent(/COMMON|BRONZE|Match|Karriere/);
  });

  it('an unlocked badge takes the tier colour, a locked one stays grey', () => {
    wrap(<AchievementsScreen />);
    const badges = screen.getAllByTestId('achievement-badge');
    expect(badges[0].style.backgroundColor).not.toBe('');
    expect(badges[1].style.backgroundColor).toBe('');
  });

  it('filters: one chip row, the area is a dropdown, "unlocked only" a switch', () => {
    wrap(<AchievementsScreen />);
    const filters = screen.getByTestId('achievement-filters');
    expect(within(filters).getAllByRole('group')).toHaveLength(1);
    expect(within(filters).getByRole('combobox', { name: 'Bereich' })).toBeInTheDocument();
    const sw = within(filters).getByRole('switch');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByTestId('achievement-meta')).toHaveLength(1);
  });
});

describe('leaderboard', () => {
  it('the medal colour is a stripe and the place number, no frame', async () => {
    wrap(<Leaderboard />);
    const rows = await screen.findAllByTestId('leaderboard-row');
    expect(rows.map(r => r.getAttribute('data-rank'))).toEqual(['1', '2', '3', '4']);
    for (const r of rows) expect(r.className).not.toMatch(/border-2|border-\[var/);
    expect(within(rows[0]).getByTestId('medal-stripe')).toBeInTheDocument();
    expect(within(rows[3]).queryByTestId('medal-stripe')).toBeNull();
    expect(rows[0]).toHaveTextContent('Platz 1');
  });
});

describe('player list', () => {
  it('two direct actions per row, the rest in the overflow menu', () => {
    wrap(<PlayerManagement />);
    const actions = screen.getAllByTestId('player-actions')[0];
    const buttons = within(actions).getAllByRole('button');
    expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual([
      expect.stringMatching(/Statistik/), expect.stringMatching(/bearbeiten|umbenennen|Name/i), 'Weitere Aktionen für Anna',
    ]);
    fireEvent.click(buttons[2]);
    expect(screen.getByRole('menuitem', { name: /löschen/i })).toBeInTheDocument();
  });
});
