/**
 * Writes the M3 spring tokens (`src/utils/springs.ts`) into
 * `src/styles/motion.css` as CSS `linear()` easings.
 *
 *   node --experimental-strip-types tools/gen-springs.ts
 *
 * The block between the markers is replaced; if it is missing it is appended
 * after the token section.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { springCssBlock, SPRING_BEGIN, SPRING_END } from '../src/utils/springs.ts';

const path = new URL('../src/styles/motion.css', import.meta.url);
const css = readFileSync(path, 'utf8');
const block = springCssBlock();
const begin = css.indexOf(SPRING_BEGIN);
const end = css.indexOf(SPRING_END);

let next: string;
if (begin >= 0 && end > begin) {
  next = css.slice(0, begin) + block + css.slice(end + SPRING_END.length);
} else {
  const anchor = '/* ----------------------------------------------------------------------------\n   2. KEYFRAMES';
  const at = css.indexOf(anchor);
  if (at < 0) throw new Error('motion.css: section 2 marker not found');
  next = css.slice(0, at) + block + '\n\n' + css.slice(at);
}
writeFileSync(path, next);
console.log('motion.css: spring tokens written');
