/**
 * Who is admin — the single source of truth.
 *
 * Exactly ONE account has admin rights, and it is decided here by e-mail
 * address, not by a flag someone can hand out. There is deliberately no way to
 * promote another user: the `make-admin` / `remove-admin` endpoints were removed
 * along with this file's introduction, so `users.is_admin` is now a *derived*
 * value rather than an independently editable one.
 *
 * `syncAdminFlag` is the reconciliation step: it is called on every login and at
 * database init, and it also DEMOTES anyone who still carries a stale admin flag
 * from before this rule existed. That means a leftover 1 in the column heals
 * itself instead of quietly granting access forever.
 */

/** The one and only admin account. */
export const MASTER_ADMIN_EMAIL = 'martinpaush@gmail.com';

/** True only for the master admin address. Case- and whitespace-insensitive. */
export function isMasterAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}

/** The value `users.is_admin` must have for this address. */
export function adminFlagFor(email: string | null | undefined): 0 | 1 {
  return isMasterAdmin(email) ? 1 : 0;
}

/**
 * Bring `users.is_admin` in line with the allowlist for one account.
 * Writes only when the stored value disagrees, so it is cheap to call often.
 *
 * @param db  better-sqlite3 database handle
 * @returns   the flag the row now carries
 */
export function syncAdminFlag(
  db: { prepare: (sql: string) => { get: (...a: unknown[]) => unknown; run: (...a: unknown[]) => unknown } },
  userId: string,
  email: string | null | undefined
): 0 | 1 {
  const want = adminFlagFor(email);
  const row = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId) as
    | { is_admin: number }
    | undefined;

  if (row && row.is_admin !== want) {
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(want, userId);
  }
  return want;
}
