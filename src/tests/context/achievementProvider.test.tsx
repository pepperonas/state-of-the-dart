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
// One stable tenant object, like the real provider (state). A fresh object per
// render re-runs the provider's [currentTenant] effect forever once
// localStorage holds data.
const tenantValue = { currentTenant: { id: 'user_u1' }, storage: null };
vi.mock('../../context/TenantContext', () => ({
  useTenant: () => tenantValue,
}));
const mockPlayers: { id: string; isBot?: boolean }[] = [];
vi.mock('../../context/PlayerContext', () => ({
  useOptionalPlayers: () => mockPlayers,
}));

import { AchievementProvider, useAchievements } from '../../context/AchievementContext';
import { mayLoadAchievements, ACHIEVEMENT_RETRY_MS } from '../../utils/achievementLoading';
import { ACHIEVEMENTS } from '../../types/achievements';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ctx: any;
const Grab = () => {
  // eslint-disable-next-line react-hooks/globals -- the probe hands the context to the test
  ctx = useAchievements();
  return null;
};

beforeEach(() => {
  localStorage.clear();
  mockPlayers.length = 0;
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

const unlockedIds = (playerId: string): string[] =>
  ctx.getPlayerProgress(playerId).unlockedAchievements.map((u: { achievementId: string }) => u.achievementId);

describe('AchievementProvider — unlock rules', () => {
  const mount = async () => {
    render(<AchievementProvider><Grab /></AchievementProvider>);
    await act(async () => {});
  };

  it('bots earn nothing — no unlock, no toast, no API call', async () => {
    mockPlayers.push({ id: 'bot1', isBot: true });
    await mount();
    await act(async () => {
      ctx.checkAchievement('bot1', 'games_played', 1);
      ctx.unlockAchievement('bot1', 'first_game');
      ctx.checkStreakProgress('bot1', 'wins', 5);
    });
    expect(unlockedIds('bot1')).toEqual([]);
    expect(unlock).not.toHaveBeenCalled();
    expect(ctx.currentNotification).toBeNull();
  });

  it('"unter 5 Minuten" is strictly under 300 seconds', async () => {
    await mount();
    await act(async () => { ctx.checkAchievement('p1', 'game_time_max', 300, undefined, { mode: 'absolute' }); });
    expect(unlockedIds('p1')).not.toContain('speed_demon');
    await act(async () => { ctx.checkAchievement('p1', 'game_time_max', 299, undefined, { mode: 'absolute' }); });
    expect(unlockedIds('p1')).toContain('speed_demon');
  });

  it('"mindestens 20 Würfe" does not unlock on a short leg', async () => {
    await mount();
    await act(async () => { ctx.checkAchievement('p1', 'leg_visits_min', 8, undefined, { mode: 'absolute' }); });
    expect(unlockedIds('p1')).not.toContain('rally_master');
    await act(async () => { ctx.checkAchievement('p1', 'leg_visits_min', 21, undefined, { mode: 'absolute' }); });
    expect(unlockedIds('p1')).toContain('rally_master');
  });

  it('checkout-percentage tiers respect their minimum attempts', async () => {
    await mount();
    await act(async () => { ctx.checkAchievement('p1', 'checkout_percentage', 65, undefined, { mode: 'absolute', attempts: 12 }); });
    expect(unlockedIds('p1')).toContain('checkout_king'); // 50 %, min. 10
    expect(unlockedIds('p1')).not.toContain('checkout_legend'); // 60 %, min. 20
  });

  it('"max" keeps the larger count', async () => {
    await mount();
    await act(async () => {
      ctx.checkAchievement('p1', 'unique_checkout_values', 7, undefined, { mode: 'max' });
      ctx.checkAchievement('p1', 'unique_checkout_values', 2, undefined, { mode: 'max' });
    });
    expect(ctx.getPlayerProgress('p1').progress.checkout_variety.current).toBe(7);
  });

  it('"all achievements" unlocks once every other one is unlocked (regression: never)', async () => {
    const allKind = ACHIEVEMENTS.filter(a => a.requirement.metric === 'achievements_unlocked' && a.requirement.target >= ACHIEVEMENTS.length).map(a => a.id);
    expect(allKind.length).toBeGreaterThanOrEqual(1);
    const last = 'first_game';
    const seeded = ACHIEVEMENTS.filter(a => !allKind.includes(a.id) && a.id !== last)
      .map(a => ({ achievementId: a.id, unlockedAt: new Date(), playerId: 'p1' }));
    localStorage.setItem('tenant_user_u1_achievements', JSON.stringify({
      p1: { playerId: 'p1', unlockedAchievements: seeded, progress: {}, totalPoints: 0 },
    }));
    await mount();
    expect(unlockedIds('p1')).not.toContain(allKind[0]);
    await act(async () => { ctx.unlockAchievement('p1', last); });
    for (const id of allKind) expect(unlockedIds('p1')).toContain(id);
  });

  it('an unlock made while the API load is in flight survives the merge', async () => {
    let resolve: (v: unknown[]) => void = () => {};
    getByPlayer.mockReset().mockReturnValue(new Promise(r => { resolve = r; }));
    await mount();
    await act(async () => { ctx.getPlayerProgress('p2'); });
    await act(async () => { ctx.unlockAchievement('p2', 'first_game'); });
    await act(async () => { resolve([]); });
    expect(unlockedIds('p2')).toContain('first_game');
  });
});
