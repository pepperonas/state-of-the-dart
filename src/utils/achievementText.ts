import type { TFunction } from 'i18next';
import type { Achievement } from '../types/achievements';

/**
 * Display text of an achievement in the active language.
 *
 * The German definitions in `types/achievements.ts` stay the source (and the
 * fallback); translations live under `achievement_defs.<id>` in the locale
 * files. `achievementDefs.test.ts` pins de.json to the definitions, so the two
 * cannot drift apart.
 */
export const achievementName = (a: Pick<Achievement, 'id' | 'name'>, t: TFunction): string =>
  t(`achievement_defs.${a.id}.name`, { defaultValue: a.name });

export const achievementDescription = (
  a: Pick<Achievement, 'id' | 'description'> & { requirement?: { target?: number } },
  t: TFunction,
): string =>
  // `target` feeds descriptions that name their own goal ("all {{target}}").
  t(`achievement_defs.${a.id}.description`, { defaultValue: a.description, target: a.requirement?.target });
