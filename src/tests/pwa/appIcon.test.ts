import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
// @ts-expect-error — plain .mjs generator, no types
import { svg } from '../../../tools/app-icon/gen.mjs';

/**
 * 0.41.0 — favicon and app icon redrawn as a bold dartboard with a dart. The
 * old favicon was hairlines on black; the app icon was a 2048 px JPEG declared
 * as 192 and 512 and "any maskable" at once.
 */
const ROOT = path.resolve(__dirname, '../../..');
const pub = (n: string) => path.join(ROOT, 'public', n);
const pngSize = (file: string) => {
  const b = fs.readFileSync(file);
  expect(b.subarray(1, 4).toString(), file).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

describe('app icon', () => {
  it('the SVGs are what the generator makes (re-run tools/app-icon after a change)', () => {
    for (const [file, kind] of [['icon.svg', 'icon'], ['icon-maskable.svg', 'maskable'], ['apple-touch-icon.svg', 'apple'], ['favicon.svg', 'favicon']]) {
      expect(fs.readFileSync(pub(file), 'utf8'), file).toBe(svg(kind));
    }
  });

  it('every manifest icon exists as a PNG of the size it claims; any and maskable are separate', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
    const icons = [...cfg.matchAll(/\{ src: '([^']+)', sizes: '(\d+)x(\d+)', type: 'image\/png', purpose: '(\w+)' \}/g)];
    expect(icons.length).toBe(3);
    for (const [, src, w, h] of icons) expect(pngSize(pub(src.slice(1))), src).toEqual([+w, +h]);
    expect(icons.map(m => m[4]).sort()).toEqual(['any', 'any', 'maskable']);
    expect(cfg).not.toMatch(/any maskable/);
  });

  it('the page links favicon.ico, the SVG and a 180 px touch icon — all present', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    for (const href of ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png']) {
      expect(html, href).toContain(`href="${href}"`);
      expect(fs.existsSync(pub(href.slice(1))), href).toBe(true);
    }
    expect(pngSize(pub('apple-touch-icon.png'))).toEqual([180, 180]);
  });

  it('favicon.ico holds 16 and 32 px PNG entries', () => {
    const b = fs.readFileSync(pub('favicon.ico'));
    expect(b.readUInt16LE(2)).toBe(1);
    expect(b.readUInt16LE(4)).toBe(2);
    expect([b.readUInt8(6), b.readUInt8(22)]).toEqual([16, 32]);
    const first = b.readUInt32LE(6 + 12);
    expect(b.subarray(first + 1, first + 4).toString()).toBe('PNG');
  });

  it('the touch icon and the maskable icon have no transparent corners', () => {
    // A transparent corner turns black behind iOS's and Android's own masks.
    for (const kind of ['apple', 'maskable']) expect(svg(kind)).toMatch(/<rect width="512" height="512" fill=/);
    expect(svg('icon')).toMatch(/rx="112"/);
  });

  it('the landing page carries the same favicon', () => {
    expect(fs.readFileSync(path.join(ROOT, 'website/public/favicon.svg'), 'utf8')).toBe(svg('favicon'));
  });
});
