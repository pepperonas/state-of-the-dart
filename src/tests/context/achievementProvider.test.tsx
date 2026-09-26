import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

const getByPlayer = vi.fn();
const unlock = vi.fn();
const updateProgress = vi.fn();
vi.mock('../../services/api', () => ({
  api: {
    achievements: {
      getByPlayer: (...a: unknown[]) => getByPlayer(...a),
      unlock: (...a: unknown[]) => unlock(...a),
      updateProgress: (...a: unknown[]) => updateProgress(...a),
      getProgress: vi.fn().mockResolvedValue([]),
    },
  },
}));
vi.mock('../../context/TenantContext', () => ({
  useTenant: () => ({ currentTenant: { id: 'user_u1' }, storage: null }),
}));

import { AchievementProvider, useAchievements } from '../../context/AchievementContext';
import { mayLoadAchievements, ACHIEVEMENT_RETRY_MS } from '../../utils/achievementLoading';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ctx: any;
const Grab = () => {
  // eslint-disable-next-line react-hooks/globals -- the probe hands the context to the test
  ctx = useAchievements();
  return null;
};

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  getByPlayer.mockReset().mockResolvedValue([]);
  unlock.mockReset().mockResolvedValue({});
  updateProgress.mockReset().mockResolvedValue({});
});

describe('AchievementProvider — progress within one check', () => {
  it('keeps the progress of every tier updated in the same check', async () => {
    render(<AchievementProvider><Grab /></AchievementProvider>);
    await act(async () => {}); // initial API load for nobody

    await act(async () => {
      // 5 games: first tier (1) unlocks, the 10/50/100/… tiers all get progress.
      ctx.checkAchievement('p1', 'games_played', 5, undefined, { mode: 'absolute' });
    });

    const progress = ctx.getPlayerProgress('p1');
    const tiersWithProgress = Object.values(progress.progress as Record<string, { current: number }>)
      .filter(p => p.current === 5);
    expect(tiersWithProgress.length).toBeGreaterThanOrEqual(5);
    // …and the unlock from the same tick is still there.
    expect(progress.unlockedAchievements.length).toBeGreaterThanOrEqual(1);
  });
});

describe('AchievementProvider — loading from the API', () => {
  it('does not hammer the API after a failed load', async () => {
    getByPlayer.mockRejectedValueOnce(new Error('offline'));
    render(<AchievementProvider><Grab /></AchievementProvider>);
    await act(async () => { ctx.getPlayerProgress('p9'); });
    await act(async () => {});
    expect(getByPlayer).toHaveBeenCalledTimes(1);

    // Immediately again: throttled, no hammering during an outage.
    await act(async () => { ctx.getPlayerProgress('p9'); });
    expect(getByPlayer).toHaveBeenCalledTimes(1);

  });
});

describe('mayLoadAchievements', () => {
  const now = 1_000_000;
  it('loads a player that was never loaded', () => {
    expect(mayLoadAchievements({ loaded: false, loading: false }, now)).toBe(true);
  });
  it('never twice at once, never after success', () => {
    expect(mayLoadAchievements({ loaded: false, loading: true }, now)).toBe(false);
    expect(mayLoadAchievements({ loaded: true, loading: false }, now)).toBe(false);
  });
  it('retries a failed load — but only after the back-off', () => {
    expect(mayLoadAchievements({ loaded: false, loading: false, failedAt: now - 1000 }, now)).toBe(false);
    expect(mayLoadAchievements({ loaded: false, loading: false, failedAt: now - ACHIEVEMENT_RETRY_MS - 1 }, now)).toBe(true);
  });
});
