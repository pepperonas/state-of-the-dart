/**
 * The numbers the landing page claims — kept honest.
 *
 * A landing page that says "463 Achievements" and then ships 400 is worse than
 * one that says nothing. These constants are pinned against the real sources in
 * `src/tests/landing/landingFacts.test.ts`, so the claim breaks the build rather
 * than quietly becoming a lie.
 *
 * They are constants and not live imports on purpose: `types/achievements.ts`
 * alone is 150 kB of definitions, and the landing is the one page that must load
 * for a first-time visitor on a phone.
 */
export const LANDING_FACTS = {
  /** ACHIEVEMENTS.length in src/types/achievements.ts */
  achievements: 463,
  /** Playable match modes: X01, Cricket, Around the Clock, Shanghai, Online */
  gameModes: 5,
  /** Entries in TrainingMenu */
  trainingModes: 6,
  /** BOT_LEVELS in src/utils/botLogic.ts */
  botLevels: 10,
} as const;
