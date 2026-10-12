import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHandover, HOLD_MS } from '../../hooks/useHandover';

/**
 * 0.34.0 — after a visit the thrower stays the hero card for HOLD_MS, so the
 * score lands where it was thrown; the game state has already moved on.
 */
type P = { active: number; visits: number; leg: number; enabled?: boolean };
const setup = (initial: P) =>
  renderHook((p: P) => useHandover(p.active, p.visits, p.leg, p.enabled ?? true), { initialProps: initial });

afterEach(() => { vi.useRealTimers(); });

describe('useHandover', () => {
  it('a visit keeps the thrower on show for HOLD_MS, then hands over', () => {
    vi.useFakeTimers();
    const h = setup({ active: 0, visits: 0, leg: 0 });
    h.rerender({ active: 1, visits: 1, leg: 0 });
    expect(h.result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(HOLD_MS - 1); });
    expect(h.result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(1); });
    expect(h.result.current).toBe(1);
  });

  it('a second change while holding jumps straight to the newest player', () => {
    vi.useFakeTimers();
    const h = setup({ active: 0, visits: 0, leg: 0 });
    h.rerender({ active: 1, visits: 1, leg: 0 });
    h.rerender({ active: 2, visits: 2, leg: 0 });
    expect(h.result.current).toBe(2);
    act(() => { vi.advanceTimersByTime(HOLD_MS * 2); });
    expect(h.result.current).toBe(2);
  });

  it('undo, a new leg and resuming change at once', () => {
    vi.useFakeTimers();
    const h = setup({ active: 1, visits: 3, leg: 0 });
    h.rerender({ active: 0, visits: 2, leg: 0 }); // undo: fewer visits
    expect(h.result.current).toBe(0);
    h.rerender({ active: 1, visits: 3, leg: 1 }); // checkout → next leg
    expect(h.result.current).toBe(1);
    h.rerender({ active: 0, visits: 3, leg: 1 }); // turn changes without a visit (resume, remove player)
    expect(h.result.current).toBe(0);
  });

  it('never holds when motion is reduced', () => {
    vi.useFakeTimers();
    const h = setup({ active: 0, visits: 0, leg: 0, enabled: false });
    h.rerender({ active: 1, visits: 1, leg: 0, enabled: false });
    expect(h.result.current).toBe(1);
  });

  it('a visit without a turn change (corrections) does not end a hold early', () => {
    vi.useFakeTimers();
    const h = setup({ active: 0, visits: 0, leg: 0 });
    h.rerender({ active: 1, visits: 1, leg: 0 });
    h.rerender({ active: 1, visits: 1, leg: 0 });
    expect(h.result.current).toBe(0);
  });
});
