import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Keeps the documentation honest.
 *
 * Every number in a README badge is a claim about the code, and claims rot in
 * silence — the Tests badge read "294 passing" for months while the suite had
 * grown well past it, and `npm run coverage` was a documented script whose
 * provider had never been installed. These tests fail when a documented fact
 * stops matching the thing it describes, so the drift surfaces in CI instead of
 * in front of a reader.
 *
 * The rule for adding to this file: pin facts that are *deliberate* (how many
 * achievements exist, which npm scripts are offered), not incidental ones that
 * churn on every commit.
 */

const ROOT = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const serverPkg = JSON.parse(read('server/package.json'));

const README_DE = read('README.md');
const README_EN = read('docs/README.en.md');
const CLAUDE_MD = read('CLAUDE.md');

/** Badge helper: `![Label](https://img.shields.io/badge/Label-VALUE-colour)` */
const badgeValue = (md: string, label: string): string | null => {
  const m = md.match(new RegExp(`img\\.shields\\.io/badge/${label}-([^-)?]+)`));
  return m ? decodeURIComponent(m[1]) : null;
};

describe('README badges state the truth', () => {
  it('the version badge matches package.json', () => {
    expect(badgeValue(README_DE, 'Version')).toBe(pkg.version);
    expect(badgeValue(README_EN, 'Version')).toBe(pkg.version);
  });

  /**
   * A version can also rot in prose. The German footer read "Version 0.8.4"
   * while package.json said 0.8.5 — invisible to a badge-only check.
   */
  it('no prose repeats a version that disagrees with package.json', () => {
    const offenders: string[] = [];
    for (const [name, md] of [['README.md', README_DE], ['docs/README.en.md', README_EN]] as const) {
      for (const m of md.matchAll(/\bVersion (\d+\.\d+\.\d+)/g)) {
        if (m[1] !== pkg.version) offenders.push(`${name}: "Version ${m[1]}" (package.json: ${pkg.version})`);
      }
    }
    expect(offenders, `Stale version strings:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the achievement count matches the definitions', () => {
    const defined = (read('src/types/achievements.ts').match(/^ {4}id: '/gm) || []).length;
    expect(defined).toBeGreaterThan(400);
    for (const [name, md] of [['DE', README_DE], ['EN', README_EN]] as const) {
      expect(badgeValue(md, 'Achievements'), `${name} README`).toBe(String(defined));
    }
  });

  it('the icon count matches the generated set', () => {
    const icons = (read('src/components/icons/paths.ts').match(/^ {2}\w+: 'M/gm) || []).length;
    expect(icons).toBeGreaterThan(50);
    for (const [name, md] of [['DE', README_DE], ['EN', README_EN]] as const) {
      expect(badgeValue(md, 'Custom_Icons'), `${name} README`).toBe(String(icons));
    }
  });

  it('the audio-file count is not overstated', () => {
    const dir = path.join(ROOT, 'public/sounds');
    const count = (function walk(d: string): number {
      return fs.readdirSync(d, { withFileTypes: true })
        .reduce((n, e) => n + (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.mp3') ? 1 : 0), 0);
    })(dir);
    const claimed = Number((badgeValue(README_DE, 'Audio_Files') || '').replace(/\D/g, ''));
    expect(claimed).toBeGreaterThan(0);
    expect(count, `README claims ${claimed} audio files, found ${count}`).toBeGreaterThanOrEqual(claimed);
  });

  /**
   * Counting `it(` blocks statically undercounts, because `it.each([...])`
   * expands to one test per row at runtime. So the badge must be at least the
   * static count — it can never claim fewer tests than are visibly written —
   * and is allowed to exceed it by the expansion factor.
   */
  it('the unit-test badge is not below the number of test blocks written', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
      });
    const blocks = walk(path.join(ROOT, 'src/tests'))
      .reduce((n, f) => n + (fs.readFileSync(f, 'utf8').match(/^\s*(it|test)(\.each\()?\(/gm) || []).length, 0);
    expect(blocks).toBeGreaterThan(100);
    for (const [name, md] of [['DE', README_DE], ['EN', README_EN]] as const) {
      const claimed = Number(badgeValue(md, 'Unit_Tests'));
      expect(claimed, `${name}: badge claims ${claimed} tests, ${blocks} blocks are written`)
        .toBeGreaterThanOrEqual(blocks);
    }
  });

  /**
   * The badge may report LESS coverage than measured, never more. Pinning an
   * exact percentage would break on every commit; overstating is the only
   * failure mode that actually misleads a reader.
   */
  it('the coverage badge never overstates the measured coverage', () => {
    const summaryPath = path.join(ROOT, 'coverage/coverage-summary.json');
    if (!fs.existsSync(summaryPath)) return; // coverage not run in this invocation
    const measured = JSON.parse(fs.readFileSync(summaryPath, 'utf8')).total;
    for (const [name, md] of [['DE', README_DE], ['EN', README_EN]] as const) {
      const raw = badgeValue(md, 'Coverage');
      expect(raw, `${name} README has no Coverage badge`).toBeTruthy();
      const [stmts, branches] = raw!.match(/\d+/g)!.map(Number);
      expect(stmts, `${name}: badge claims ${stmts}% statements, measured ${measured.statements.pct}%`)
        .toBeLessThanOrEqual(Math.ceil(measured.statements.pct));
      expect(branches, `${name}: badge claims ${branches}% branches, measured ${measured.branches.pct}%`)
        .toBeLessThanOrEqual(Math.ceil(measured.branches.pct));
    }
  });

  /**
   * Structural only — deliberately no network call. Reaching shields.io from CI
   * would make the suite fail on a flaky connection rather than on a real defect.
   * (All 48 URLs were verified to return SVG by hand when they were written.)
   */
  it('every badge URL is well-formed and served over https', () => {
    const offenders: string[] = [];
    for (const [name, md] of [['README.md', README_DE], ['docs/README.en.md', README_EN]] as const) {
      for (const m of md.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)) {
        const u = m[1];
        if (!u.startsWith('https://')) offenders.push(`${name}: not https — ${u}`);
        else if (!/img\.shields\.io|github\.com\/.+\/badge\.svg/.test(u)) {
          offenders.push(`${name}: unexpected badge host — ${u}`);
        }
      }
    }
    expect(offenders, `Malformed badges:\n${offenders.join('\n')}`).toEqual([]);
  });

  /** A badge pointing at a workflow file that no longer exists renders as a broken image. */
  it('every workflow badge points at a workflow that exists', () => {
    for (const md of [README_DE, README_EN]) {
      for (const m of md.matchAll(/actions\/workflows\/([\w.-]+\.yml)\/badge\.svg/g)) {
        expect(fs.existsSync(path.join(ROOT, '.github/workflows', m[1])), `missing workflow ${m[1]}`).toBe(true);
      }
    }
  });
});

describe('documented commands exist', () => {
  it('every `npm run <script>` mentioned in the docs is a real script', () => {
    const scripts = new Set([...Object.keys(pkg.scripts), ...Object.keys(serverPkg.scripts)]);
    const offenders: string[] = [];
    for (const [name, md] of [['README.md', README_DE], ['docs/README.en.md', README_EN], ['CLAUDE.md', CLAUDE_MD]] as const) {
      for (const m of md.matchAll(/npm run ([\w:]+)/g)) {
        if (!scripts.has(m[1])) offenders.push(`${name}: npm run ${m[1]}`);
      }
    }
    expect(offenders, `Documented scripts that do not exist:\n${offenders.join('\n')}`).toEqual([]);
  });

  /**
   * `npm run coverage` was documented for months while `@vitest/coverage-v8`
   * was never installed, so the command always failed.
   */
  it('the coverage script has its provider installed', () => {
    const dev = pkg.devDependencies ?? {};
    if (pkg.scripts.coverage?.includes('--coverage')) {
      expect(dev['@vitest/coverage-v8'] ?? dev['@vitest/coverage-istanbul']).toBeTruthy();
    }
  });
});

describe('documented paths exist', () => {
  /** The commonest form of doc rot: a file gets moved and the reference dangles. */
  it('every repo-relative path referenced in the READMEs resolves', () => {
    const offenders: string[] = [];
    const candidate = /`((?:src|server|docs|e2e|public|scripts|tools|\.github)\/[\w./-]+)`/g;
    for (const [name, md] of [['README.md', README_DE], ['docs/README.en.md', README_EN], ['CLAUDE.md', CLAUDE_MD]] as const) {
      for (const m of md.matchAll(candidate)) {
        const p = m[1].replace(/[.,)]$/, '');
        // Skip globs and illustrative placeholders.
        if (/[*<>]/.test(p)) continue;
        // …and paths that are produced at runtime rather than committed. The
        // docs legitimately name them (the E2E database, the build output), but
        // they do not exist in a clean checkout — which is exactly what CI is.
        if (/^(server\/data|dist|coverage|node_modules)\//.test(p)) continue;
        if (!fs.existsSync(path.join(ROOT, p))) offenders.push(`${name}: ${p}`);
      }
    }
    expect(offenders, `Dangling paths in docs:\n${offenders.join('\n')}`).toEqual([]);
  });

  /** The EN README's hero image pointed at `public/…`, which resolves inside `docs/`. */
  it('every relative <img src> resolves', () => {
    const offenders: string[] = [];
    for (const [name, md, base] of [
      ['README.md', README_DE, '.'],
      ['docs/README.en.md', README_EN, 'docs'],
    ] as const) {
      for (const m of md.matchAll(/<img[^>]+src="(?!https?:)([^"]+)"/g)) {
        if (!fs.existsSync(path.normalize(path.join(ROOT, base, m[1])))) offenders.push(`${name} -> ${m[1]}`);
      }
    }
    expect(offenders, `Broken images:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every markdown link to a repo file resolves', () => {
    const offenders: string[] = [];
    // Every doc under docs/ is checked, not only the READMEs — the architecture
    // doc linked `./server/README.md`, which resolves inside `docs/` and dangled.
    const docs: [string, string, string][] = [
      ['README.md', README_DE, '.'],
      ...fs.readdirSync(path.join(ROOT, 'docs'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => [`docs/${f}`, read(`docs/${f}`), 'docs'] as [string, string, string]),
    ];
    for (const [name, md, base] of docs) {
      for (const m of md.matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)) {
        const target = m[1].split('#')[0];
        if (!target) continue;
        const resolved = path.normalize(path.join(ROOT, base, target));
        if (!fs.existsSync(resolved)) offenders.push(`${name} -> ${target}`);
      }
    }
    expect(offenders, `Broken document links:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('the two READMEs stay in step', () => {
  it('both link to each other', () => {
    expect(README_DE).toMatch(/docs\/README\.en\.md/);
    expect(README_EN).toMatch(/README\.md/);
  });

  it('both carry the same badge set', () => {
    const labels = (md: string) =>
      [...md.matchAll(/img\.shields\.io\/badge\/([^-)]+)-/g)].map((m) => m[1]).sort();
    expect(new Set(labels(README_EN))).toEqual(new Set(labels(README_DE)));
  });
});

describe('the backend README documents the whole API', () => {
  /** Five route groups shipped without ever reaching the API docs. */
  it('every mounted /api/<area> appears in server/README.md', () => {
    const index = read('server/src/index.ts');
    const mounted = [...index.matchAll(/app\.use\('(\/api\/[\w-]+)'/g)].map((m) => m[1]);
    expect(mounted.length).toBeGreaterThan(8);
    const doc = read('server/README.md');
    const missing = mounted.filter((m) => !doc.includes(m));
    expect(missing, `Mounted but undocumented: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('the architecture doc matches the API', () => {
  it('every documented /api/<area> has a route module', () => {
    const arch = read('docs/ARCHITECTURE.md');
    const areas = new Set(
      [...arch.matchAll(/`?(?:GET|POST|PUT|PATCH|DELETE)\s+\/api\/([\w-]+)/g)].map((m) => m[1])
    );
    expect(areas.size).toBeGreaterThan(3);
    const files = fs.readdirSync(path.join(ROOT, 'server/src/routes')).map((f) => f.replace(/\.ts$/, '').toLowerCase());
    const missing = [...areas].filter((a) => !files.includes(a.toLowerCase().replace(/-/g, '')));
    expect(missing, `Documented API areas with no route module: ${missing.join(', ')}`).toEqual([]);
  });
});
