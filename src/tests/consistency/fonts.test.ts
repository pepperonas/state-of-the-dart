import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

/**
 * 0.46.0: the type of klatsch.celox.io — Roboto Flex for text, Bangers for
 * display — served from our own origin. A Google Fonts link sneaking back in
 * would leak every visitor's IP to Google and bring back the old faces.
 */
describe('self-hosted klatsch type', () => {
  it('index.html asks no third party for fonts', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    expect(html).toContain('/fonts/roboto-flex-latin.woff2');
    expect(html).toContain('/fonts/bangers.woff2');
  });

  it('every font file the CSS names exists, with its licence', () => {
    const css = read('src/styles/fonts.css');
    const urls = [...css.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length).toBe(3);
    for (const u of urls) expect(fs.existsSync(path.join(root, 'public', u)), u).toBe(true);
    for (const l of ['OFL-roboto-flex.txt', 'OFL-bangers.txt']) {
      expect(fs.existsSync(path.join(root, 'public/licenses', l)), l).toBe(true);
    }
  });

  it('display type and scores use Bangers, text uses Roboto Flex', () => {
    const m3 = read('src/styles/m3.css');
    const display = m3.slice(m3.indexOf('.m3-display-large, .m3-display-medium'));
    expect(display.slice(0, display.indexOf('}'))).toContain('var(--sotd-font-display)');
    const numeral = m3.slice(m3.indexOf('.sotd-numeral {'));
    expect(numeral.slice(0, numeral.indexOf('}'))).toContain('var(--sotd-font-display)');
    const code = m3.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/'Inter'|Google Sans/);
    expect(read('src/styles/fonts.css')).toMatch(/--sotd-font-text: 'Roboto Flex'/);
  });

  it('Bangers glyphs get room on the right, so a leaning last letter is not clipped', () => {
    const m3 = read('src/styles/m3.css');
    const i = m3.indexOf('padding-inline-end: 0.12em');
    expect(i, 'room rule').toBeGreaterThan(-1);
    const rule = m3.slice(m3.lastIndexOf('}', i) + 1, m3.indexOf('}', i));
    for (const c of ['.m3-display-large', '.m3-headline-medium', '.sotd-numeral', '.sotd-rank-stamp']) expect(rule, c).toContain(c);
    expect(rule).toContain('margin-inline-end: -0.12em');
  });
});
