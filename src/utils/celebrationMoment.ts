import { useSyncExternalStore } from 'react';

/**
 * "A leg or match has just ended." Set by the game screen while its leg-won
 * overlay or winner screen is up; read by the achievement notifications, which
 * then present themselves centre stage instead of as a dismissible toast.
 */
let active = false;
const listeners = new Set<() => void>();

export const setCelebrationMoment = (value: boolean): void => {
  if (active === value) return;
  active = value;
  listeners.forEach(l => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export const useCelebrationMoment = (): boolean => useSyncExternalStore(subscribe, () => active, () => false);
