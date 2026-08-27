import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { applyTheme, revealTheme } from '../../utils/theme';

/**
 * The theme swap is small but load-bearing: `ThemeManager` calls it on every
 * settings change and on load, and the reveal calls it from inside a view
 * transition. If it is not idempotent, two themes end up on the element at once
 * and the light palette loses to the dark one (or the reverse) at random.
 */
const classes = () => ({
  html: [...document.documentElement.classList],
  body: [...document.body.classList],
});

beforeEach(() => {
  document.documentElement.className = '';
  document.body.className = '';
  document.body.style.fontFamily = '';
});
afterEach(() => { vi.restoreAllMocks(); });

describe('applyTheme', () => {
  it('puts the theme on both html and body', () => {
    applyTheme('modern-light');
    expect(classes().html).toContain('modern-light');
    expect(classes().body).toContain('modern-light');
  });

  /** Two theme classes at once means the cascade decides at random. */
  it('never leaves two themes on the element', () => {
    applyTheme('modern');
    applyTheme('modern-light');
    expect(classes().html).toEqual(['modern-light']);
    expect(classes().body).toEqual(['modern-light']);
  });

  it('is idempotent', () => {
    applyTheme('modern');
    applyTheme('modern');
    expect(classes().html.filter((c) => c === 'modern')).toHaveLength(1);
  });

  /** `dark` is a legacy class; it must be cleared or it fights the token layer. */
  it('clears the legacy dark class', () => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    applyTheme('modern-light');
    expect(classes().html).not.toContain('dark');
    expect(classes().body).not.toContain('dark');
  });

  it('leaves unrelated classes alone', () => {
    document.body.classList.add('scroll-locked');
    applyTheme('modern');
    expect(classes().body).toContain('scroll-locked');
  });

  it('sets the body font', () => {
    applyTheme('modern');
    expect(document.body.style.fontFamily).toContain('Inter');
  });
});

describe('revealTheme', () => {
  const noTransitionApi = () => {
    // jsdom has no startViewTransition; make that explicit.
    delete (document as unknown as Record<string, unknown>).startViewTransition;
  };

  it('applies the theme even without the View Transitions API', () => {
    noTransitionApi();
    revealTheme('modern-light', { clientX: 10, clientY: 10 });
    expect(classes().html).toContain('modern-light');
  });

  it('still calls persist when it falls back to an instant swap', () => {
    noTransitionApi();
    const persist = vi.fn();
    revealTheme('modern', { clientX: 0, clientY: 0 }, persist);
    expect(persist).toHaveBeenCalledOnce();
  });

  it('works with no origin, e.g. a keyboard-triggered toggle', () => {
    noTransitionApi();
    expect(() => revealTheme('modern', null)).not.toThrow();
    expect(classes().html).toContain('modern');
  });

  /** Reduced motion must skip the animation but still change the theme. */
  it('swaps instantly under prefers-reduced-motion', () => {
    const startViewTransition = vi.fn();
    (document as unknown as Record<string, unknown>).startViewTransition = startViewTransition;
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    revealTheme('modern-light', { clientX: 5, clientY: 5 });
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(classes().html).toContain('modern-light');
  });

  describe('with the View Transitions API', () => {
    const stubTransition = () => {
      const api = vi.fn((cb: () => void) => {
        cb(); // the browser runs the callback to take the "after" snapshot
        return { finished: Promise.resolve() };
      });
      (document as unknown as Record<string, unknown>).startViewTransition = api;
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
      return api;
    };

    it('performs the swap inside the transition callback', () => {
      const api = stubTransition();
      revealTheme('modern-light', { clientX: 100, clientY: 200 });
      expect(api).toHaveBeenCalledOnce();
      expect(classes().html).toContain('modern-light');
    });

    it('publishes the origin and a radius that covers the viewport', () => {
      stubTransition();
      revealTheme('modern-light', { clientX: 100, clientY: 200 });
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--m3-vt-x')).toBe('100px');
      expect(style.getPropertyValue('--m3-vt-y')).toBe('200px');
      const radius = parseFloat(style.getPropertyValue('--m3-vt-r'));
      // Must reach the furthest corner, else the old theme stays visible in it.
      const furthest = Math.hypot(
        Math.max(100, window.innerWidth - 100),
        Math.max(200, window.innerHeight - 200)
      );
      expect(radius).toBeCloseTo(furthest, 5);
    });

    it('marks the document while animating so the app can freeze transitions', () => {
      stubTransition();
      revealTheme('modern-light', { clientX: 0, clientY: 0 });
      expect(document.documentElement.classList.contains('m3-theme-anim')).toBe(true);
    });

    it('removes that marker once the transition settles', async () => {
      stubTransition();
      revealTheme('modern-light', { clientX: 0, clientY: 0 });
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
      expect(document.documentElement.classList.contains('m3-theme-anim')).toBe(false);
    });

    it('centres on the viewport when no origin is given', () => {
      stubTransition();
      revealTheme('modern', null);
      expect(document.documentElement.style.getPropertyValue('--m3-vt-x'))
        .toBe(`${window.innerWidth / 2}px`);
    });
  });
});
