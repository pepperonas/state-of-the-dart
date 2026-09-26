import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

const get = vi.fn();
const update = vi.fn();
vi.mock('../../services/api', () => ({
  api: { settings: { get: (...a: unknown[]) => get(...a), update: (...a: unknown[]) => update(...a) } },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../../i18n/config', () => ({ default: { changeLanguage: vi.fn().mockResolvedValue(undefined) } }));

import { SettingsProvider, useSettings } from '../../context/SettingsContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ctx: any;
const Grab = () => { ctx = useSettings(); return null; };

const mount = async () => {
  render(<SettingsProvider><Grab /></SettingsProvider>);
  await waitFor(() => expect(ctx.loading).toBe(false));
};

beforeEach(() => {
  get.mockReset().mockResolvedValue({ theme: 'modern', language: 'de', sound_volume: 70, caller_volume: 70, effects_volume: 70 });
  update.mockReset().mockResolvedValue({});
});

describe('SettingsProvider', () => {
  it('two quick updates both survive — the second builds on the first', async () => {
    await mount();
    await act(async () => {
      const a = ctx.updateSettings({ callerVolume: 20 });
      const b = ctx.updateSettings({ effectsVolume: 30 });
      await Promise.all([a, b]);
    });
    expect(ctx.settings).toMatchObject({ callerVolume: 20, effectsVolume: 30 });
    expect(update.mock.calls[1][0]).toMatchObject({ caller_volume: 20, effects_volume: 30 });
  });

  it('a failed update rolls back only its own change', async () => {
    await mount();
    update.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    await act(async () => {
      const failing = ctx.updateSettings({ callerVolume: 10 }).catch(() => {});
      const ok = ctx.updateSettings({ effectsVolume: 40 });
      await Promise.all([failing, ok]);
    });
    expect(ctx.settings.callerVolume).toBe(70);
    expect(ctx.settings.effectsVolume).toBe(40);
  });

  it('writes the dartboard helper to its own column', async () => {
    await mount();
    await act(async () => { await ctx.updateSettings({ showDartboardHelper: false }); });
    expect(update.mock.calls[0][0]).toMatchObject({ show_dartboard_helper: false });
    expect(update.mock.calls[0][0]).not.toHaveProperty('enable_achievements_hints');
  });

  it('reads the dartboard helper from its own column, falling back to the old one', async () => {
    get.mockResolvedValue({ show_dartboard_helper: 0, enable_achievements_hints: 1 });
    await mount();
    expect(ctx.settings.showDartboardHelper).toBe(false);
  });
});
