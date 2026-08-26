import { describe, it, expect } from 'vitest';
import { reporterOptions, filterByReporter } from '../../utils/reporters';

const row = (userEmail?: string, userName?: string) => ({ userEmail, userName });

describe('reporterOptions', () => {
  it('is empty when there is nothing to filter', () => {
    expect(reporterOptions([])).toEqual([]);
  });

  it('offers each reporter once, however many entries they filed', () => {
    const opts = reporterOptions([
      row('a@x.de', 'Anna'), row('a@x.de', 'Anna'), row('b@x.de', 'Ben'),
    ]);
    expect(opts.map((o) => o.value)).toEqual(['a@x.de', 'b@x.de']);
  });

  /**
   * The `Map` would dedupe on its own; the guard is there so the FIRST name seen
   * wins. Rows arrive newest-first, so a renamed account shows its current name
   * rather than whichever one happens to sort last.
   */
  it('keeps the first name seen for an address', () => {
    const opts = reporterOptions([
      row('a@x.de', 'Neuer Name'),
      row('a@x.de', 'Alter Name'),
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].label).toBe('Neuer Name');
  });

  it('sorts by display name, not by email', () => {
    const opts = reporterOptions([row('z@x.de', 'Anna'), row('a@x.de', 'Zoe')]);
    expect(opts.map((o) => o.label)).toEqual(['Anna', 'Zoe']);
  });

  it('falls back to the email when no name is stored', () => {
    expect(reporterOptions([row('nameless@x.de')])[0].label).toBe('nameless@x.de');
    expect(reporterOptions([row('nameless@x.de', '   ')])[0].label).toBe('nameless@x.de');
  });

  /** An option that matches no row is worse than no option. */
  it('skips rows with no email, since they cannot be filtered on', () => {
    expect(reporterOptions([row(undefined, 'Ghost'), row('', 'Empty'), row('  ', 'Blank')])).toEqual([]);
  });

  it('keeps whitespace out of the value it matches on', () => {
    expect(reporterOptions([row('  a@x.de  ', 'Anna')])[0].value).toBe('a@x.de');
  });

  it('exposes name and email together so typeahead finds either', () => {
    const [opt] = reporterOptions([row('anna@x.de', 'Anna')]);
    expect(opt.text).toContain('Anna');
    expect(opt.text).toContain('anna@x.de');
  });

  it('survives a null row list', () => {
    expect(reporterOptions(null as never)).toEqual([]);
  });
});

describe('filterByReporter', () => {
  const rows = [row('a@x.de', 'Anna'), row('b@x.de', 'Ben'), row('a@x.de', 'Anna')];

  it('"all" passes everything through', () => {
    expect(filterByReporter(rows, 'all')).toHaveLength(3);
  });

  it('keeps only the chosen reporter', () => {
    const out = filterByReporter(rows, 'a@x.de');
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.userEmail === 'a@x.de')).toBe(true);
  });

  /** Splitting by every reporter must account for every row exactly once. */
  it('the per-reporter splits add up to the whole', () => {
    const total = reporterOptions(rows)
      .reduce((n, o) => n + filterByReporter(rows, o.value).length, 0);
    expect(total).toBe(rows.length);
  });

  it('an unknown reporter yields nothing rather than everything', () => {
    expect(filterByReporter(rows, 'nobody@x.de')).toEqual([]);
  });

  /**
   * Only the literal string 'all' means "no filter". An empty value must not
   * fall through to showing everything — that would silently drop the filter.
   */
  it('an empty filter value is not treated as "all"', () => {
    expect(filterByReporter(rows, '')).toEqual([]);
  });
});
