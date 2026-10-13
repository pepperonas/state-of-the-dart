// Renders the generated SVGs to PNG with Chromium (exact SVG support, unlike
// ImageMagick's internal renderer) and writes favicon.ico (PNG entries).
//   node tools/app-icon/gen.mjs && node tools/app-icon/render.mjs [--preview out.png]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const pub = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../public');
const read = n => fs.readFileSync(path.join(pub, n), 'utf8');

const TARGETS = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['apple-touch-icon.svg', 'apple-touch-icon.png', 180],
  ['favicon.svg', 'favicon-32.png', 32],
  ['favicon.svg', 'favicon-16.png', 16],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const render = async (svgText, size) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svgText.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};

const pngs = {};
for (const [src, out, size] of TARGETS) {
  const buf = await render(read(src), size);
  fs.writeFileSync(path.join(pub, out), buf);
  pngs[out] = buf;
}

// favicon.ico: ICONDIR + one 16-byte entry per size; since Vista the entries may be raw PNG.
const entries = [['favicon-16.png', 16], ['favicon-32.png', 32]];
const head = Buffer.alloc(6 + 16 * entries.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
let offset = head.length;
entries.forEach(([n, s], i) => {
  const b = pngs[n], e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(b.length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += b.length;
});
fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([head, ...entries.map(([n]) => pngs[n])]));

// Optional preview sheet: every size on a light and a dark tab strip.
const i = process.argv.indexOf('--preview');
if (i > 0) {
  const img = (n, s) => `<img src="data:image/png;base64,${pngs[n].toString('base64')}" width="${s}" height="${s}" style="image-rendering:pixelated">`;
  const row = bg => `<div style="background:${bg};padding:16px;display:flex;gap:24px;align-items:end">
    ${img('favicon-16.png', 16)}${img('favicon-16.png', 64)}${img('favicon-32.png', 32)}${img('favicon-32.png', 96)}
    ${img('apple-touch-icon.png', 180)}${img('icon-192.png', 192)}${img('icon-maskable-512.png', 192)}
    <div style="flex:none;width:192px;height:192px;border-radius:50%;overflow:hidden">${img('icon-maskable-512.png', 192)}</div></div>`;
  await page.setViewportSize({ width: 1100, height: 460 });
  await page.setContent(`<html><body style="margin:0">${row('#f1f3f4')}${row('#202124')}</body></html>`);
  await page.screenshot({ path: process.argv[i + 1], fullPage: true });
}
// The landing page (website/) shows the same mark in its tab and header.
const site = path.resolve(pub, '../website/public');
for (const n of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) fs.copyFileSync(path.join(pub, n), path.join(site, n));

await browser.close();
console.log('rendered', TARGETS.map(t => t[1]).join(', '), '+ favicon.ico');
