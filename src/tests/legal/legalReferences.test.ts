import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LEGAL = path.resolve(__dirname, '../../components/legal');
const read = (f: string) => fs.readFileSync(path.join(LEGAL, f), 'utf8');

/**
 * ⚠️ Comments in these files quote the very strings the tests forbid (they
 * document what was replaced). Strip comments first, or the test fails on its
 * own explanation — and, worse, would keep passing once the real reference came
 * back next to a comment mentioning it.
 */
const code = (f: string) =>
  read(f)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PAGES = ['Impressum.tsx', 'Datenschutz.tsx', 'Nutzungsbedingungen.tsx'];

describe('legal references are current', () => {
  it('cites the DDG, not the repealed TMG', () => {
    // The TMG was absorbed into the DDG on 14 May 2024; the provider details
    // moved to § 5 DDG unchanged.
    for (const f of PAGES) {
      expect(code(f), `${f} still cites the TMG`).not.toMatch(/\bTMG\b/);
    }
    expect(code('Impressum.tsx')).toContain('&sect; 5 DDG');
  });

  it('does not renumber the liability privileges into §§ 8–10 DDG', () => {
    // Those sections of the DDG carry entirely different content (blocking
    // claims, media-service lists, information requests). The privileges live in
    // the DSA now, and § 7 DDG points at it.
    const src = code('Impressum.tsx');
    // ⚠️ The file writes entities (`&sect;&sect;`), not literal `§§` — a regex
    // for the glyph alone silently never matches. Caught by mutation testing.
    expect(src).not.toMatch(/(§|&sect;){1,2}\s*8\s*bis\s*10\s*DDG/);
    expect(src).toContain('&sect; 7 Abs. 1 DDG');
    expect(src).toContain('2022/2065');
  });

  it('carries no reference to the shut-down EU ODR platform', () => {
    // The Commission took the platform offline on 20 July 2025 and the duty to
    // link it lapsed with it. A dead mandatory notice is itself a liability.
    for (const f of PAGES) {
      const src = code(f);
      expect(src, `${f} links the ODR platform`).not.toContain('consumers/odr');
      expect(src, `${f} mentions the OS platform`).not.toMatch(/Online-Streitbeilegung|OS-Plattform/);
    }
  });

  it('keeps the consumer-arbitration statement, which is a separate duty', () => {
    // § 36 VSBG is untouched by the ODR shutdown — this must NOT be removed.
    expect(code('Impressum.tsx')).toMatch(/Verbraucherschlichtungsstelle/);
  });

  it('names the broadcasting-law provision that is actually in force', () => {
    const src = code('Impressum.tsx');
    expect(src).toContain('&sect; 18 Abs. 2 MStV');
    expect(src).not.toMatch(/\bRStV\b/); // replaced by the MStV in Nov 2020
  });
});
