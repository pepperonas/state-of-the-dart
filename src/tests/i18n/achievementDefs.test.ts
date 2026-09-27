import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { TFunction } from 'i18next';
import de from '../../i18n/locales/de.json';
import en from '../../i18n/locales/en.json';
import { ACHIEVEMENTS } from '../../types/achievements';
import { achievementDescription, achievementName } from '../../utils/achievementText';
import i18n from '../../i18n/config';

type Defs = Record<string, { name: string; description: string }>;
const DE = (de as unknown as { achievement_defs: Defs }).achievement_defs;
const EN = (en as unknown as { achievement_defs: Defs }).achievement_defs;

/**
 * The 463 achievement texts are defined in German in types/achievements.ts and
 * translated in the locale files. These pin the two together.
 */
describe('achievement texts', () => {
  it('every achievement has a name and description in both languages', () => {
    const missing = ACHIEVEMENTS.filter(a => !DE[a.id]?.name || !DE[a.id]?.description || !EN[a.id]?.name || !EN[a.id]?.description).map(a => a.id);
    expect(missing).toEqual([]);
  });

  it('de.json is word for word the definitions (no drift)', () => {
    const drift = ACHIEVEMENTS.filter(a => DE[a.id] && (DE[a.id].name !== a.name || DE[a.id].description !== a.description)).map(a => a.id);
    expect(drift).toEqual([]);
  });

  it('the locale files hold no achievement that no longer exists', () => {
    const ids = new Set(ACHIEVEMENTS.map(a => a.id));
    expect(Object.keys(DE).filter(id => !ids.has(id))).toEqual([]);
    expect(Object.keys(EN).filter(id => !ids.has(id))).toEqual([]);
  });

  it('"all achievements" names the real count, in both languages', async () => {
    const perfectionist = ACHIEVEMENTS.find(a => a.id === 'perfectionist')!;
    await i18n.changeLanguage('de');
    expect(achievementDescription(perfectionist, i18n.t as TFunction)).toBe(`Schalte alle ${ACHIEVEMENTS.length} Erfolge frei`);
    await i18n.changeLanguage('en');
    expect(achievementDescription(perfectionist, i18n.t as TFunction)).toBe(`Unlock all ${ACHIEVEMENTS.length} achievements`);
    expect(achievementName({ id: 'first_game', name: 'x' }, i18n.t as TFunction)).toBe(EN.first_game.name);
    await i18n.changeLanguage('de');
  });

  it('components render achievement text only through the helpers', () => {
    const root = path.resolve(__dirname, '../..');
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? (e.name === 'tests' ? [] : walk(p)) : /\.tsx?$/.test(p) ? [p] : [];
    });
    const offenders: string[] = [];
    for (const f of walk(root)) {
      const src = fs.readFileSync(f, 'utf8');
      // {achievement.name} / {achievement.description} in JSX, or handed on as display text.
      // `${achievement.name}` in a log line is not display text (lookbehind).
      for (const m of src.matchAll(/(?<!\$)\{\s*(\w*[aA]chievement\w*)\.(name|description)\s*\}|achievementName:\s*\w*[aA]chievement\w*\.name\b/g)) {
        offenders.push(`${path.relative(root, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
