import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import de from '../../i18n/locales/de.json';
import en from '../../i18n/locales/en.json';
import it_ from '../../i18n/locales/it.json';
import es from '../../i18n/locales/es.json';
import fr from '../../i18n/locales/fr.json';
import { scanLiterals, scanLanguageForks } from './scanLiterals';

const SRC = path.resolve(__dirname, '../..');
const walk = (dir: string, ext: RegExp): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'tests' ? [] : walk(p, ext);
    return ext.test(p) ? [p] : [];
  });
const TSX = walk(SRC, /\.tsx$/);
const CODE = walk(SRC, /\.tsx?$/);
const rel = (p: string) => path.relative(SRC, p);

/**
 * German legal texts. The German version is the legally binding one; a
 * translation would be a second, unreviewed legal document.
 */
const LEGAL = new Set(['components/legal/Datenschutz.tsx', 'components/legal/Impressum.tsx', 'components/legal/Nutzungsbedingungen.tsx']);

type Tree = { [k: string]: string | Tree | unknown[] };
const flat = (o: Tree, p = ''): Map<string, unknown> => {
  const m = new Map<string, unknown>();
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [kk, vv] of flat(v as Tree, `${p}${k}.`)) m.set(kk, vv);
    else m.set(`${p}${k}`, v);
  }
  return m;
};
const DE = flat(de as Tree);
const EN = flat(en as Tree);
const PLURAL = ['_one', '_other', '_zero', '_two', '_few', '_many'];
const has = (m: Map<string, unknown>, k: string) => m.has(k) || PLURAL.some(s => m.has(k + s));

describe('i18n guard', () => {
  it('no user-visible text is hard-coded in JSX (legal texts excepted)', () => {
    const offenders: string[] = [];
    for (const f of TSX) {
      if (LEGAL.has(rel(f))) continue;
      for (const l of scanLiterals(fs.readFileSync(f, 'utf8'), f)) offenders.push(`${rel(f)}:${l.line} [${l.where}] "${l.text.slice(0, 50)}"`);
    }
    expect(offenders, `Use t() for:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no hand-written language forks beside i18next', () => {
    const offenders: string[] = [];
    for (const f of CODE) for (const line of scanLanguageForks(fs.readFileSync(f, 'utf8'))) offenders.push(`${rel(f)}:${line}`);
    expect(offenders).toEqual([]);
  });

  it('German and English have the same keys', () => {
    const onlyDe = [...DE.keys()].filter(k => !EN.has(k));
    const onlyEn = [...EN.keys()].filter(k => !DE.has(k));
    expect({ onlyDe, onlyEn }).toEqual({ onlyDe: [], onlyEn: [] });
  });

  it('every statically used key exists in both languages', () => {
    const missing: string[] = [];
    // t('a.b'), t("a.b"), i18nKey="a.b" — keys built at runtime (template literals) are not checked
    const re = /(?:\bt\(\s*|i18nKey=\{?\s*)(['"])([a-z][\w-]*(?:\.[\w-]+)+)\1/g;
    for (const f of CODE) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(re)) {
        const k = m[2];
        if (!has(DE, k) || !has(EN, k)) missing.push(`${rel(f)}: ${k}${has(DE, k) ? ' (en)' : has(EN, k) ? ' (de)' : ''}`);
      }
    }
    expect([...new Set(missing)], `Missing keys:\n${[...new Set(missing)].join('\n')}`).toEqual([]);
  });

  it('placeholders agree between the languages', () => {
    const ph = (v: unknown) => (typeof v === 'string' ? [...v.matchAll(/\{\{\s*(\w+)/g)].map(m => m[1]).sort().join(',') : '');
    const off = [...DE.keys()].filter(k => EN.has(k) && ph(DE.get(k)) !== ph(EN.get(k)));
    expect(off).toEqual([]);
  });

  // Italian, Spanish, French (0.50.0): the same keys as English (plus the
  // `_many` plural forms those languages have), same placeholders and tags.
  const OTHERS = { it: flat(it_ as Tree), es: flat(es as Tree), fr: flat(fr as Tree) };
  const base = (k: string) => k.replace(/_many$/, '_other');
  for (const [lng, m] of Object.entries(OTHERS)) {
    it(`${lng}: every English key is translated, nothing extra`, () => {
      const missing = [...EN.keys()].filter(k => !m.has(k));
      const extra = [...m.keys()].filter(k => !EN.has(base(k)));
      expect({ missing: missing.slice(0, 20), extra: extra.slice(0, 20) }).toEqual({ missing: [], extra: [] });
    });
    it(`${lng}: placeholders and tags match English`, () => {
      const ph = (v: unknown) => (typeof v === 'string' ? [...v.matchAll(/\{\{\s*(\w+)|<\/?\w+\s*\/?>/g)].map(x => x[1] ?? x[0]).sort().join(',') : '');
      const off = [...m.keys()].filter(k => EN.has(base(k)) && ph(m.get(k)) !== ph(EN.get(base(k))));
      expect(off.slice(0, 20)).toEqual([]);
    });
    it(`${lng}: really translated, not English copied over`, () => {
      const strings = [...m.entries()].filter(([k, v]) => typeof v === 'string' && (v as string).length > 25 && EN.has(k));
      const same = strings.filter(([k, v]) => v === EN.get(k));
      expect(strings.length).toBeGreaterThan(800);
      expect(same.length / strings.length).toBeLessThan(0.05);
    });
  }

  it('it/es/fr load on demand, never with the main bundle', () => {
    for (const f of CODE) {
      if (rel(f) === 'i18n/config.ts') continue;
      expect(fs.readFileSync(f, 'utf8'), rel(f)).not.toMatch(/from ['"][./]*i18n\/locales\/(it|es|fr)\.json['"]/);
    }
    const cfg = fs.readFileSync(path.join(SRC, 'i18n/config.ts'), 'utf8');
    expect(cfg).not.toMatch(/^import .*locales\/(it|es|fr)/m);
    expect(cfg).toMatch(/import\('\.\/locales\/it\.json'\)/);
  });

  it('the scanner catches what it is meant to catch (cross-check)', () => {
    const src = `const X = () => <div title="Hallo Welt">Guten Tag {ok ? 'Online' : 'Offline'} {'Moin moin'}<span>T20</span></div>;`;
    const texts = scanLiterals(src).map(l => l.text);
    expect(texts).toEqual(expect.arrayContaining(['Hallo Welt', 'Guten Tag', 'Online', 'Offline', 'Moin moin']));
    expect(texts).not.toContain('T20');
    expect(scanLanguageForks(`const s = language === 'de' ? 'Hallo' : 'Hi';`)).toEqual([1]);
    expect(scanLanguageForks(`u.lang = language === 'de' ? 'de-DE' : 'en-US';`)).toEqual([]);
    expect(scanLanguageForks(`return language === 'de' ? preset.nameDE : preset.name;`)).toEqual([]);
  });
});
