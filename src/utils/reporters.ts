/**
 * Builds the "filter by user" options for the admin tables.
 *
 * Derived from the rows actually on screen, not from the user table: a filter
 * offering accounts with no entries is noise, and one that omits a reporter
 * would silently hide their entries — the worse of the two failures.
 */

export interface ReporterRow {
  userEmail?: string;
  userName?: string;
}

export interface ReporterOption {
  /** The email — stable, and what the row is matched on. */
  value: string;
  /** Display name, falling back to the email when no name is stored. */
  label: string;
  /** Both, so the Select's typeahead finds either. */
  text: string;
}

export function reporterOptions(rows: ReporterRow[]): ReporterOption[] {
  const byEmail = new Map<string, string>();

  for (const row of rows ?? []) {
    const email = row?.userEmail?.trim();
    // A row with no email cannot be filtered on; offering it would produce an
    // option that matches nothing.
    if (!email) continue;
    if (!byEmail.has(email)) {
      byEmail.set(email, row.userName?.trim() || email);
    }
  }

  return [...byEmail.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }))
    .map(([value, label]) => ({ value, label, text: `${label} ${value}` }));
}

/** Keeps only the rows belonging to `email`; `'all'` passes everything through. */
export function filterByReporter<T extends ReporterRow>(rows: T[], email: string): T[] {
  if (email === 'all') return rows;
  return rows.filter((r) => r.userEmail === email);
}
