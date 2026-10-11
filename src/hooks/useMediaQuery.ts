import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept live. Used to MOUNT layout-specific
 * parts instead of hiding them with CSS: a `hidden lg:block` column still runs
 * everything inside it (the fire shader kept a WebGL context alive on phones).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** Tailwind's `lg` breakpoint. */
export const DESKTOP_QUERY = '(min-width: 1024px)';
