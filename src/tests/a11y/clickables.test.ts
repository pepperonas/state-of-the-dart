import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanClickables } from './scanClickables';

const ROOT = path.resolve(__dirname, '../../components');
const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });

/**
 * The SVG board: 82 beds as tab stops would be worse than none. The dart grid
 * in ScoreInput (S/D/T × 1–20/Bull, real buttons) is the keyboard and screen
 * reader equivalent of every bed.
 */
const EXEMPT = new Set(['dartboard/Dartboard.tsx']);

describe('clickable elements are controls', () => {
  it('nothing reacts to a click without being reachable by keyboard', () => {
    const offenders: string[] = [];
    for (const f of walk(ROOT)) {
      const rel = path.relative(ROOT, f);
      if (EXEMPT.has(rel)) continue;
      for (const c of scanClickables(fs.readFileSync(f, 'utf8'))) offenders.push(`${rel}:${c.line} <${c.tag} onClick>`);
    }
    expect(offenders, `Use <button>/<a> (or a role + key handler):\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the scanner catches a clickable div (cross-check)', () => {
    expect(scanClickables('const X = () => <div onClick={go}>x</div>;')).toHaveLength(1);
    expect(scanClickables('const X = () => <motion.div onClick={go}>x</motion.div>;')).toHaveLength(1);
    expect(scanClickables('const X = () => <button onClick={go}>x</button>;')).toHaveLength(0);
    expect(scanClickables('const X = () => <div data-backdrop onClick={close} />;')).toHaveLength(0);
    expect(scanClickables('const X = () => <div onClick={(e) => e.stopPropagation()} />;')).toHaveLength(0);
  });
});
