/** How long to wait before asking the API again after a failed load. */
export const ACHIEVEMENT_RETRY_MS = 30_000;

/**
 * Whether a player's achievements should be fetched now: not loaded, not in
 * flight, and — after a failure — only once the back-off has passed.
 */
export const mayLoadAchievements = (
  state: { loaded: boolean; loading: boolean; failedAt?: number },
  now: number,
): boolean =>
  !state.loaded && !state.loading &&
  (state.failedAt === undefined || now - state.failedAt > ACHIEVEMENT_RETRY_MS);
