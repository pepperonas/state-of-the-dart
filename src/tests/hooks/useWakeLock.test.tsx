import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from '../../hooks/useWakeLock';
import { haptic, HAPTIC_PATTERNS } from '../../utils/haptics';

type Listener = () => void;
const makeSentinel = () => {
  const listeners: Listener[] = [];
  const s = {
    release: vi.fn(async () => { listeners.forEach(l => l()); }),
    addEventListener: (_: string, l: Listener) => listeners.push(l),
  };
  return s;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;
let visibility = 'visible';

beforeEach(() => {
  request = vi.fn(async () => makeSentinel());
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { get: () => visibility, configurable: true });
});
afterEach(() => { delete (navigator as unknown as { wakeLock?: unknown }).wakeLock; });

const flush = () => act(async () => { await Promise.resolve(); });

describe('useWakeLock', () => {
  it('holds the screen while active and releases it afterwards', async () => {
    const { rerender } = renderHook(({ on }) => useWakeLock(on), { initialProps: { on: true } });
    await flush();
    expect(request).toHaveBeenCalledWith('screen');
    const sentinel = await request.mock.results[0].value;
    rerender({ on: false });
    expect(sentinel.release).toHaveBeenCalled();
  });

  it('re-acquires the lock when the page becomes visible again', async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    const first = await request.mock.results[0].value;
    visibility = 'hidden';
    await act(async () => { await first.release(); }); // the browser drops it on hide
    visibility = 'visible';
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does nothing when inactive', async () => {
    renderHook(() => useWakeLock(false));
    await flush();
    expect(request).not.toHaveBeenCalled();
  });
});

describe('haptic', () => {
  it('vibrates only when enabled', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    haptic('bust', false);
    expect(vibrate).not.toHaveBeenCalled();
    haptic('bust', true);
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.bust);
  });

  it('is a no-op without the Vibration API', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    expect(() => haptic('dart', true)).not.toThrow();
  });
});
