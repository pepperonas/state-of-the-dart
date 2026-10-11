#!/usr/bin/env node
/**
 * Lines of code behind the README badge: non-blank lines that are not pure
 * comments, in the TypeScript/TSX/CSS/JS sources of the app, the server, the
 * E2E suite and the tools. Generated output, dependencies and build artefacts
 * are left out.
 *
 *   node scripts/count-loc.mjs        → prints the count and the badge value
 *
 * `src/tests/docs/docsSync.test.ts` runs the same count and fails when the
 * badge drifts from it, so the number is measured, never typed by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LOC_DIRS = ['src', 'server/src', 'e2e', 'tools', 'scripts'];
const SKIP = new Set(['node_modules', 'dist', 'out', 'build', 'coverage']);
const EXT = /\.(ts|tsx|css|mjs|js)$/;

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  if (SKIP.has(e.name)) return [];
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : EXT.test(e.name) ? [p] : [];
});

/** Counts code lines: block comments and `//` lines are not code. */
export function countFile(text) {
  let n = 0;
  let inBlock = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) {
        inBlock = false;
        if (line.slice(line.indexOf('*/') + 2).trim()) n++;
      }
      continue;
    }
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      else if (line.slice(line.indexOf('*/') + 2).trim()) n++;
      continue;
    }
    n++;
  }
  return n;
}

export function countLoc(root = ROOT) {
  return LOC_DIRS
    .filter(d => fs.existsSync(path.join(root, d)))
    .flatMap(d => walk(path.join(root, d)))
    .reduce((sum, f) => sum + countFile(fs.readFileSync(f, 'utf8')), 0);
}

/** Badge form: thousands, rounded down — the badge never claims more. */
export const badgeValue = loc => `~${Math.floor(loc / 1000)}k`;

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const loc = countLoc();
  console.log(`${loc} lines of code → badge ${badgeValue(loc)}`);
}
