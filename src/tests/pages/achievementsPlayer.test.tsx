import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/config';

/**
 * 0.36.0 — the player picker on the achievements screen was empty and showed
 * 0/463 because it took players[0] once, on the first render, when the list was
 * still loading. The selection now follows the list.
 */
let players: { id: string; name: string }[] = [];
vi.mock('../../context/PlayerContext', () => ({ usePlayer: () => ({ players }) }));
vi.mock('../../context/AchievementContext', () => ({
  useAchievements: () => ({
    getPlayerProgress: (id: string) => ({ unlockedAchievements: id === 'a' ? [{ achievementId: 'first_game' }] : [], progress: {}, totalPoints: id === 'a' ? 10 : 0 }),
    getUnlockedAchievements: (id: string) => (id === 'a' ? [{ id: 'first_game' }] : []),
    getLockedAchievements: () => [],
    isAchievementUnlocked: () => false,
  }),
}));

import AchievementsScreen from '../../components/achievements/AchievementsScreen';

describe('achievements player picker', () => {
  it('selects the first player once the list arrives after the first render', () => {
    players = [];
    const { rerender } = render(<MemoryRouter><AchievementsScreen /></MemoryRouter>);
    players = [{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Ben' }];
    rerender(<MemoryRouter><AchievementsScreen /></MemoryRouter>);
    expect(screen.getByRole('combobox', { name: /spieler/i })).toHaveTextContent('Anna');
    expect(screen.getByTestId('achievements-total')).toHaveTextContent('1/');
  });

  it('a navigation destination has no back button, the title is the page h1', () => {
    players = [{ id: 'a', name: 'Anna' }];
    render(<MemoryRouter><AchievementsScreen /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /zurück/i })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
