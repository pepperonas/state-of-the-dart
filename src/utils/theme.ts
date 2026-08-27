/**
 * Theme application + the Material 3 Expressive theme reveal.
 *
 * `applyTheme` is the single place that knows how a theme reaches the DOM —
 * `ThemeManager` calls it on every settings change (and on load), the reveal
 * below calls it from inside a view transition. It is idempotent: every class is
 * removed before the new one goes on, so calling it twice is harmless.
 *
 * `revealTheme` wraps that swap in a circular reveal growing out of the control
 * the user just pressed. It degrades to an instant swap when the browser has no
 * View Transitions API and when the user asked for reduced motion.
 */

export type ThemeName = 'modern' | 'modern-light';

const THEME_CLASSES = ['modern', 'modern-light', 'dark'];

const BODY_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/** Put `theme` on <html> and <body>. Idempotent. */
export function applyTheme(theme: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { body } = document;

  root.classList.remove(...THEME_CLASSES);
  body.classList.remove(...THEME_CLASSES);
  root.classList.add(theme);
  body.classList.add(theme);
  body.style.fontFamily = BODY_FONT;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Origin = { clientX: number; clientY: number };

/**
 * Swap the theme behind a circular reveal centred on `origin`.
 *
 * The swap happens inside the view-transition callback ON PURPOSE: React state
 * updates are asynchronous, so persisting the setting would not have repainted
 * by the time the browser takes its "after" snapshot. The class swap is the
 * visible change; `persist` only records it, and runs afterwards.
 */
export function revealTheme(theme: ThemeName, origin: Origin | null, persist?: () => void): void {
  const swap = () => applyTheme(theme);

  // startViewTransition is not in older lib.dom typings.
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (!doc.startViewTransition || prefersReducedMotion()) {
    swap();
    persist?.();
    return;
  }

  const root = document.documentElement;
  const x = origin ? origin.clientX : window.innerWidth / 2;
  const y = origin ? origin.clientY : window.innerHeight / 2;
  // Reach the furthest corner, so the circle always covers the viewport.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  root.style.setProperty('--m3-vt-x', `${x}px`);
  root.style.setProperty('--m3-vt-y', `${y}px`);
  root.style.setProperty('--m3-vt-r', `${radius}px`);
  root.classList.add('m3-theme-anim');

  const transition = doc.startViewTransition(swap);
  transition.finished
    .catch(() => undefined)
    .finally(() => root.classList.remove('m3-theme-anim'));

  persist?.();
}
