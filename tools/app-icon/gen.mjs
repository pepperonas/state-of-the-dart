// Generates the app icon and favicon as SVG. Geometry is COMPUTED (wedges,
// rings, the dart along its axis), like tools/gen-icons.py — never typed.
//   node tools/app-icon/gen.mjs        → public/icon.svg, public/icon-maskable.svg, public/favicon.svg
//   node tools/app-icon/render.mjs     → the PNG sizes
import fs from 'node:fs';
import path from 'node:path';

const f = n => Math.round(n * 100) / 100;
const rad = d => (d * Math.PI) / 180;
const pt = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];

/** Annular sector from angle a0 to a1 between radii r0 and r1. */
const sector = (cx, cy, r0, r1, a0, a1) => {
  const [x0, y0] = pt(cx, cy, r1, a0), [x1, y1] = pt(cx, cy, r1, a1);
  const [x2, y2] = pt(cx, cy, r0, a1), [x3, y3] = pt(cx, cy, r0, a0);
  return `M${f(x0)} ${f(y0)}A${f(r1)} ${f(r1)} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${f(r0)} ${f(r0)} 0 0 0 ${f(x3)} ${f(y3)}Z`;
};

export const COLORS = {
  tileTop: '#0d4a6e', tileBottom: '#06263a',
  surround: '#0b0b0d', black: '#1c1c1f', cream: '#f3e7c6',
  red: '#e53935', green: '#2ea44f',
  steel: '#cfd6dc', steelDark: '#7d8a94', flight: '#4fc3f7', flightDark: '#0288d1', outline: '#081018',
};
const C = COLORS;

/**
 * Board in proportions bolded for an icon: thick double and treble rings, a
 * big bull. Fractions of the board radius.
 */
const RINGS = { surround: 1, double: [0.74, 0.9], outerSingle: [0.5, 0.74], treble: [0.38, 0.5], innerSingle: [0.17, 0.38], outerBull: 0.17, bull: 0.085 };

const board = (cx, cy, R) => {
  let s = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="${C.surround}"/>`;
  for (let i = 0; i < 20; i++) {
    const a0 = -99 + i * 18, a1 = a0 + 18;
    const dark = i % 2 === 0; // the 20 at the top is a dark segment, as on a real board
    const single = dark ? C.black : C.cream;
    const ring = dark ? C.red : C.green;
    s += `<path d="${sector(cx, cy, RINGS.double[0] * R, RINGS.double[1] * R, a0, a1)}" fill="${ring}"/>`;
    s += `<path d="${sector(cx, cy, RINGS.outerSingle[0] * R, RINGS.outerSingle[1] * R, a0, a1)}" fill="${single}"/>`;
    s += `<path d="${sector(cx, cy, RINGS.treble[0] * R, RINGS.treble[1] * R, a0, a1)}" fill="${ring}"/>`;
    s += `<path d="${sector(cx, cy, RINGS.innerSingle[0] * R, RINGS.innerSingle[1] * R, a0, a1)}" fill="${single}"/>`;
  }
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(RINGS.outerBull * R)}" fill="${C.green}"/>`;
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(RINGS.bull * R)}" fill="${C.red}"/>`;
  return s;
};

/** Simplified board for 16–32 px: concentric rings only — wedges blur to grey there. */
const simpleBoard = (cx, cy, R) =>
  [[1, C.surround], [0.9, C.red], [0.74, C.cream], [0.5, C.green], [0.38, C.cream], [0.17, C.green], [0.085, C.red]]
    .map(([r, c]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * R)}" fill="${c}"/>`).join('');

/**
 * A dart stuck in the board: tip at (tx, ty), pointing down-left at `deg`
 * (the direction it travelled), `L` = total length. Built along its own axis.
 */
const dart = (tx, ty, deg, L, { outline = 0.05, thick = 1 } = {}) => {
  const u = [Math.cos(rad(deg)), Math.sin(rad(deg))]; // direction of flight
  const n = [-u[1], u[0]];
  // `thick` widens everything but the length — small sizes need a fatter dart.
  const at = (s, w) => [tx - u[0] * s * L + n[0] * w * thick * L, ty - u[1] * s * L + n[1] * w * thick * L];
  const poly = pts => 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
  // s = distance back from the tip, w = half width (fractions of L)
  const point = poly([at(0, 0), at(0.2, 0.018), at(0.2, -0.018)]);
  const barrel = poly([at(0.18, 0.045), at(0.46, 0.06), at(0.5, 0.04), at(0.5, -0.04), at(0.46, -0.06), at(0.18, -0.045)]);
  const shaft = poly([at(0.5, 0.025), at(0.72, 0.025), at(0.72, -0.025), at(0.5, -0.025)]);
  const flightA = poly([at(0.66, 0), at(0.8, 0.17), at(1, 0.17), at(0.94, 0)]);
  const flightB = poly([at(0.66, 0), at(0.8, -0.17), at(1, -0.17), at(0.94, 0)]);
  const all = [point, barrel, shaft, flightA, flightB];
  const ow = f(outline * L);
  // One dark outline under everything separates the dart from the board.
  let s = all.map(d => `<path d="${d}" fill="${C.outline}" stroke="${C.outline}" stroke-width="${ow}" stroke-linejoin="round"/>`).join('');
  s += `<path d="${point}" fill="${C.steel}"/>`;
  s += `<path d="${barrel}" fill="url(#barrel)"/>`;
  s += `<path d="${shaft}" fill="${C.steelDark}"/>`;
  s += `<path d="${flightA}" fill="${C.flight}"/><path d="${flightB}" fill="${C.flightDark}"/>`;
  return s;
};

const defs = `<defs>
<linearGradient id="tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.tileTop}"/><stop offset="1" stop-color="${C.tileBottom}"/></linearGradient>
<linearGradient id="barrel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f5"/><stop offset="1" stop-color="${C.steelDark}"/></linearGradient>
</defs>`;

/**
 * @param {'icon'|'maskable'|'apple'|'favicon'} kind
 *  icon     — rounded tile, full detail (192/512, apple-touch on its own)
 *  maskable — square edge to edge, artwork inside the 80 % safe zone
 *  favicon  — rounded tile, concentric board, bigger dart (16–48 px)
 */
export const svg = kind => {
  const S = 512;
  // iOS masks the touch icon itself: a square edge to edge, transparent
  // corners would turn black behind its rounded mask.
  const square = kind === 'maskable' || kind === 'apple';
  const scale = kind === 'maskable' ? 0.8 : kind === 'apple' ? 0.92 : 1;
  const o = (S * (1 - scale)) / 2;
  const tile = square
    ? `<rect width="${S}" height="${S}" fill="url(#tile)"/>`
    : `<rect width="${S}" height="${S}" rx="${kind === 'favicon' ? 120 : 112}" fill="url(#tile)"/>`;
  const R = kind === 'favicon' ? 218 : 206;
  const cx = kind === 'favicon' ? 236 : 240, cy = kind === 'favicon' ? 276 : 272;
  const art = (kind === 'favicon' ? simpleBoard(cx, cy, R) : board(cx, cy, R))
    // tip just off the bull, the dart leaning in from the top right
    + dart(cx + R * 0.05, cy - R * 0.05, 135, kind === 'favicon' ? 330 : 290,
      kind === 'favicon' ? { outline: 0.07, thick: 1.7 } : { outline: 0.045, thick: 1.25 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">${defs}${tile}<g transform="translate(${f(o)} ${f(o)}) scale(${scale})">${art}</g></svg>\n`;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../public');
  fs.writeFileSync(path.join(out, 'icon.svg'), svg('icon'));
  fs.writeFileSync(path.join(out, 'icon-maskable.svg'), svg('maskable'));
  fs.writeFileSync(path.join(out, 'favicon.svg'), svg('favicon'));
  fs.writeFileSync(path.join(out, 'apple-touch-icon.svg'), svg('apple'));
  console.log('wrote icon.svg, icon-maskable.svg, apple-touch-icon.svg, favicon.svg');
}
