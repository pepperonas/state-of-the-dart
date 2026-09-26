import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanNestedElevation } from './scanNestedElevation';

const ROOT = path.resolve(__dirname, '../../components');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });

const FILES = walk(ROOT).map((p) => [path.relative(ROOT, p), fs.readFileSync(p, 'utf8')] as const);
/** Components plus the app shell — the loading screen lived in App.tsx and escaped every check. */
const APP_FILE = path.resolve(__dirname, '../../App.tsx');
const ALL_FILES = [...FILES, ['../App.tsx', fs.readFileSync(APP_FILE, 'utf8')] as const];

/** Comments quote the very rules these tests forbid — strip them first. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/**
 * The consistency contract. The audit that produced it found eight different
 * container widths, four heading levels for the page title, three screens with
 * no title at all, and a legacy class layer that ignored the light theme.
 * These pin the result so it cannot drift back.
 */
describe('page consistency', () => {
  /** The four named steps in PageShell. Anything else is drift. */
  const ALLOWED_WIDTHS = ['2xl', '4xl', '6xl', '7xl'];

  it('every page container uses one of the four named width steps', () => {
    const offenders: string[] = [];
    for (const [rel, src] of FILES) {
      const code = stripComments(src);
      // A page container is a `max-w-*` that sits directly on a `mx-auto` wrapper
      // inside a full-height shell. Inner reading widths are not page containers.
      // The page container is the wrapper directly inside the full-height shell.
      // A `max-w-*` deeper in the tree is a reading width, not a page width.
      for (const m of code.matchAll(/min-h-dvh[^"]*"[^>]*>\s*<div className="max-w-(\w+) mx-auto/g)) {
        if (!ALLOWED_WIDTHS.includes(m[1])) offenders.push(`${rel}: max-w-${m[1]}`);
      }
    }
    // …and the same for pages that already went through PageShell.
    const TIERS = ['sm', 'md', 'lg', 'xl'];
    for (const [rel, src] of FILES) {
      if (rel === 'common/PageShell.tsx') continue;
      for (const m of stripComments(src).matchAll(/<PageShell[\s\S]{0,200}?width="(\w+)"/g)) {
        if (!TIERS.includes(m[1])) offenders.push(`${rel}: PageShell width="${m[1]}"`);
      }
    }
    expect(offenders, `Off-scale page widths:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the legacy class layer is gone from components', () => {
    const legacy = ['glass-card', 'bg-dark-', 'text-dark-'];
    const offenders: string[] = [];
    for (const [rel, src] of FILES) {
      const code = stripComments(src);
      for (const c of legacy) if (code.includes(c)) offenders.push(`${rel}: ${c}`);
    }
    expect(offenders, `Legacy classes:\n${offenders.join('\n')}`).toEqual([]);
  });

  /**
   * Classes that silently do nothing or break the light theme. Each of these
   * was found in the M3 audit (2026-09):
   * - `error-500`/`error-400`: the Tailwind `error` colour has no number scale,
   *   so error text rendered in the default colour;
   * - `dark:` variants: the app never sets the `dark` class, so the light-theme
   *   greys always won — dark grey text on dark surfaces;
   * - `text-white`: white on the light theme's light surfaces;
   * - `font-black`/`font-extrabold`: weights the Inter import does not load;
   * - `md:m3-*`: the M3 type scale is plain CSS, responsive prefixes do nothing.
   */
  it('no dead or theme-blind classes', () => {
    const rules: Array<[RegExp, string]> = [
      [/\b(text|border|bg|ring)-error-\d{2,3}\b/, 'numbered error colour'],
      [/(^|[\s"'`])dark:/, 'dark: variant'],
      [/\btext-white\b/, 'text-white'],
      [/\bfont-(black|extrabold)\b/, 'unloaded font weight'],
      [/\b(sm|md|lg|xl):m3-/, 'responsive prefix on an m3 type class'],
      [/\bglass-card\b/, 'glass-card'],
    ];
    const offenders: string[] = [];
    for (const [rel, src] of ALL_FILES) {
      const code = stripComments(src);
      for (const [re, what] of rules) if (re.test(code)) offenders.push(`${rel}: ${what}`);
    }
    expect(offenders, `Dead/theme-blind classes:\n${offenders.join('\n')}`).toEqual([]);
  });

  /**
   * Colours come from the M3 roles. The numbered legacy scales (`primary-500`,
   * `success-400`, …) predate the token layer and ignore the light theme; the
   * raw Tailwind palette is allowed only where the colour IS the data or the
   * point: heatmap legends (cold→hot), the theme preview tiles, the gold of a
   * leg win.
   */
  it('colours come from M3 roles', () => {
    const numbered = /\b(?:text|bg|border|ring|from|to|via|fill|stroke|shadow)-(?:primary|secondary|success|warning|accent|error|tertiary|danger|info)-\d{2,3}\b/;
    const raw = /\b(?:text|bg|border|ring|from|to|via|fill|stroke|shadow|divide)-(?:gray|red|blue|green|yellow|amber|orange|purple|pink|slate|zinc|neutral|emerald|sky|indigo|violet|rose|lime|teal|cyan|fuchsia|stone)-\d{2,3}\b/;
    const RAW_ALLOWED = new Set([
      'dartboard/DartboardHeatmapBlur.tsx', // cold→hot legend
      'stats/StatsOverview.tsx', // heatmap legend dots
      'player/PlayerProfile.tsx', // heatmap legend dots
      'Settings.tsx', // theme preview tiles show the themes themselves
      'game/GameScreen.tsx', // leg-win gold
    ]);
    const offenders: string[] = [];
    for (const [rel, src] of ALL_FILES) {
      const code = stripComments(src);
      if (numbered.test(code)) offenders.push(`${rel}: numbered legacy colour`);
      if (!RAW_ALLOWED.has(rel) && raw.test(code)) offenders.push(`${rel}: raw palette colour`);
    }
    expect(offenders, `Off-token colours:\n${offenders.join('\n')}`).toEqual([]);
  });

  /** Browser alert/confirm boxes ignore the theme and the language. Use useFeedback(). */
  it('no window.alert / window.confirm', () => {
    const offenders: string[] = [];
    for (const [rel, src] of ALL_FILES) {
      if (rel === 'common/Feedback.tsx') continue;
      const code = stripComments(src);
      if (/(^|[^.\w])(window\.)?alert\(/m.test(code)) offenders.push(`${rel}: alert(`);
      if (/window\.confirm\(|(^|[^.\w])(?<!await\s)confirm\(/m.test(code.replace(/await confirm\(/g, ''))) offenders.push(`${rel}: confirm(`);
    }
    expect(offenders, `Native dialogs:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('PageShell is the single definition of the width scale', () => {
    const shell = fs.readFileSync(path.join(ROOT, 'common/PageShell.tsx'), 'utf8');
    for (const w of ALLOWED_WIDTHS) expect(shell).toContain(`max-w-${w}`);
    // The page title level every screen converged on.
    expect(shell).toContain('m3-headline-medium');
  });

  it('the light theme cannot override token utilities again', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../index.css'), 'utf8');
    // Bare-element rules under .modern-light were (0,1,1) and beat every token
    // utility (0,1,0) — that is how `bg-primary-container` rendered as #3b82f6.
    // They must stay inside :where() so they carry zero specificity.
    const bare = [...css.matchAll(/^\.modern-light (button|p|h1|input|textarea|select)\b[^{]*\{/gm)];
    expect(
      bare.map((m) => m[0]),
      'Legacy .modern-light element rules must be wrapped in :where()'
    ).toEqual([]);
    // …and the state variants need the state INSIDE the :where(), or they are
    // (0,1,0) again and win anyway.
    expect(css).not.toMatch(/:where\([^)]*\):hover\s*\{/);
  });

  /**
   * A native `<select>` renders its popup in the OS layer, where none of the M3
   * tokens reach it: platform grey, platform font, and — in the light theme —
   * unreadable without a bespoke `select option` override. `common/Select`
   * replaced all 23 of them. Anything reintroducing one is drift.
   */
  it('no native select survives anywhere in the components', () => {
    const offenders: string[] = [];
    for (const [rel, src] of FILES) {
      // ⚠️ Comments in `Select.tsx` and elsewhere quote the very tag this test
      // forbids — compare against the comment-free source or it self-triggers.
      const code = stripComments(src);
      if (/<select[\s>]/.test(code)) offenders.push(rel);
    }
    expect(offenders, `Native <select> found in:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the shared Select is exported from the primitive barrel', () => {
    const barrel = fs.readFileSync(path.join(ROOT, 'common/index.ts'), 'utf8');
    expect(barrel).toMatch(/export \{ default as Select \} from '\.\/Select'/);
  });

  /**
   * The trigger's own colours sit in `:where()` so a caller's class always wins
   * — that is what keeps the admin status pills coloured instead of repainting
   * them the default grey. Restating them at (0,1,0) would silently take over,
   * because `m3.css` is imported after Tailwind.
   */
  it('the Select trigger keeps its paint at zero specificity', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../styles/m3.css'), 'utf8');
    // `button:where(...)` = (0,0,1): beats Tailwind's `button { background:
    // transparent }` preflight, still loses to a caller's `.bg-*` at (0,1,0).
    expect(css).toMatch(/button:where\(\.m3-select-trigger\)\s*\{[^}]*background-color/);
    expect(css, 'paint must not be raised to class specificity').not.toMatch(
      /^\.m3-select-trigger\s*\{[^}]*background-color/m
    );
    // A bare `.m3-select-trigger { background-color: … }` would out-rank callers.
    const bare = [...css.matchAll(/^\.m3-select-trigger[^{]*\{([^}]*)\}/gm)];
    for (const m of bare) {
      expect(m[1], 'Layout-only: paint belongs in the :where() block').not.toMatch(
        /(^|[;\s])(background-color|border-color|color)\s*:/
      );
    }
  });

  /**
   * `border-radius: inherit` in the shared focus ring does not round the
   * outline — it replaces the focused element's own radius with its parent's.
   * `:focus-visible` counts as a class, so the rule ties with `.m3-button` and
   * `.m3-text-field` and wins on import order. Measured before the fix: a pill
   * button went 9999px → 913px and a text field 12px → 0px on keyboard focus.
   */
  it('the shared focus ring does not reshape the element it focuses', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../styles/motion.css'), 'utf8');
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, ''); // comments quote the rule they forbid
    const rule = bare.match(/:where\([^)]*\):focus-visible\s*\{([^}]*)\}/);
    expect(rule, 'the shared :focus-visible rule went missing').toBeTruthy();
    expect(rule![1]).toMatch(/outline:/);
    expect(rule![1], 'border-radius in the focus ring flattens every focused element').not.toMatch(
      /border-radius/
    );
  });

  /** Fields and select triggers share one shape so they read as siblings. */
  it('inputs are on the expressive shape scale, not the 4px default', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../styles/m3.css'), 'utf8');
    for (const sel of ['.m3-text-field', '.m3-select-trigger']) {
      const block = css.match(new RegExp(`\\n\\${sel}\\s*\\{([^}]*)\\}`));
      expect(block, `${sel} block not found`).toBeTruthy();
      expect(block![1], `${sel} should not use the 4px xs radius`).toMatch(
        /border-radius:\s*var\(--m3-shape-md\)/
      );
    }
  });

  /**
   * `.m3-state-layer` and `.m3-ripple` only need the host to be *a* containing
   * block. Declaring `position: relative` at (0,1,0) tied with Tailwind's
   * `.fixed` and — because these files load after Tailwind — won, silently
   * un-fixing anything carrying both. The Debug-Flag button was `relative` for
   * exactly that reason: it never floated, and its `bottom` offset only pushed
   * it further up the page.
   */
  it('the state layer and ripple never override a position utility', () => {
    const files = {
      'styles/m3.css': fs.readFileSync(path.resolve(__dirname, '../../styles/m3.css'), 'utf8'),
      'styles/motion.css': fs.readFileSync(path.resolve(__dirname, '../../styles/motion.css'), 'utf8'),
    };
    const offenders: string[] = [];
    for (const [name, css] of Object.entries(files)) {
      // Comments here describe the very bug this forbids — compare bare CSS.
      const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
      for (const cls of ['m3-state-layer', 'm3-ripple']) {
        // A rule that sets `position` for this class must carry zero specificity.
        const re = new RegExp(`(^|[},])\\s*([^{}]*\\.${cls}(?![\\w-])[^{}]*)\\{([^}]*)\\}`, 'g');
        for (const m of bare.matchAll(re)) {
          const [selector, body] = [m[2].trim(), m[3]];
          if (!/(^|[;\s])position\s*:/.test(body)) continue;
          if (selector.includes('::')) continue; // pseudo-elements are their own box
          if (!selector.startsWith(':where(')) {
            offenders.push(`${name}: "${selector}" sets position outside :where()`);
          }
        }
      }
    }
    expect(offenders, `These would out-rank a caller's fixed/absolute:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('admin rights cannot be granted through the API', () => {
    const api = fs.readFileSync(path.resolve(__dirname, '../../services/api.ts'), 'utf8');
    expect(api).not.toContain('make-admin');
    expect(api).not.toMatch(/makeAdmin|removeAdmin/);
  });

  it('no transition-all: it animates layout properties and ignores the motion tokens', () => {
    const offenders = ALL_FILES.filter(([, src]) => /\btransition-all\b/.test(stripComments(src))).map(([rel]) => rel);
    expect(offenders).toEqual([]);
  });

  it('nested surfaces are separated by tone, not by stacked shadows', () => {
    const offenders = FILES.flatMap(([rel, src]) => scanNestedElevation(src).map(l => `${rel}:${l}`));
    expect(offenders, 'elevated card inside an elevated card — use variant="filled" or "outlined" inside').toEqual([]);
  });

  it('the nested-elevation scanner catches both card forms (cross-check)', () => {
    expect(scanNestedElevation('const X = () => <Card><Card>x</Card></Card>;')).toHaveLength(1);
    expect(scanNestedElevation('const X = () => <div className="m3-card m3-elevated"><div className="m3-card m3-elevated" /></div>;')).toHaveLength(1);
    expect(scanNestedElevation('const X = () => <Card><Card variant="filled">x</Card></Card>;')).toHaveLength(0);
  });
});
