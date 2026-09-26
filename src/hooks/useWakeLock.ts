import { useEffect } from 'react';

/**
 * Keeps the screen on while `active` — a phone that dims and locks mid-leg is
 * the most common interruption at the board.
 *
 * The browser releases the lock whenever the page is hidden (tab switch, screen
 * off), so it is re-acquired on `visibilitychange`. Where the Wake Lock API is
 * missing or refused, nothing happens.
 */
export const useWakeLock = (active: boolean): void => {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinel) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) { lock.release().catch(() => {}); return; }
        sentinel = lock;
        lock.addEventListener('release', () => { if (sentinel === lock) sentinel = null; });
      } catch {
        // Refused (battery saver, permissions policy) — the game still works.
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') acquire(); };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
};
