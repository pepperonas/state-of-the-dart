/**
 * YYYY-MM-DD in the server's local time — the same calendar SQLite's
 * 'localtime' modifier uses. `toISOString()` is UTC and named the previous day
 * for every hour east of Greenwich, which broke every daily streak.
 */
export const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
