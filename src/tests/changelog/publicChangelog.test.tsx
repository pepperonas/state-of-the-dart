import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import pkg from '../../../package.json';
import { PUBLIC_CHANGELOG } from '../../data/publicChangelog';
import ChangelogPage from '../../components/changelog/ChangelogPage';
import { formatReleaseDate } from '../../utils/releaseDate';
import '../../i18n/config';

const cmp = (a: string, b: string) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

/** The in-app changelog (0.50.0): public, English, no internals. */
describe('public changelog', () => {
  it('starts with the current version — a release needs an entry', () => {
    expect(PUBLIC_CHANGELOG[0].version).toBe(pkg.version);
  });

  it('newest first, unique versions, valid dates that never go forward', () => {
    const versions = PUBLIC_CHANGELOG.map(r => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (let i = 1; i < PUBLIC_CHANGELOG.length; i++) {
      const [a, b] = [PUBLIC_CHANGELOG[i - 1], PUBLIC_CHANGELOG[i]];
      expect(cmp(a.version, b.version), `${a.version} before ${b.version}`).toBeGreaterThan(0);
      expect(a.date >= b.date, `${a.version} ${a.date} / ${b.version} ${b.date}`).toBe(true);
    }
    for (const r of PUBLIC_CHANGELOG) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.title.length).toBeGreaterThan(2);
      expect(r.items.length).toBeGreaterThan(0);
    }
  });

  it('says nothing private: no security, infrastructure, admin, money or contact details', () => {
    const forbidden = /secur|vulnerab|exploit|bypass|attack|password|token|secret|credential|smtp|e-?mail|server|\bvps\b|database|\bdb\b|backup|admin|\bcost|price|pricing|revenue|€|\$|payment|paypal|invoice|celox|\bapi\b|nginx|pm2|sqlite|\b\d{1,3}(\.\d{1,3}){3}\b|@/i;
    const hits = PUBLIC_CHANGELOG.flatMap(r => [r.title, ...r.items].filter(s => forbidden.test(s)).map(s => `${r.version}: ${s}`));
    expect(hits).toEqual([]);
  });

  it('the forbidden-word check catches what it should (cross-check)', () => {
    const forbidden = /secur|password|server|admin|price|€/i;
    expect(['Security fix', 'New price', 'Server moved', '5 €'].every(s => forbidden.test(s))).toBe(true);
  });

  it('dates read in English without a time zone shift', () => {
    expect(formatReleaseDate('2026-01-01')).toBe('1 January 2026');
    expect(formatReleaseDate('2026-11-22')).toBe('22 November 2026');
  });

  it('the page is English even when the app speaks German', async () => {
    const i18n = (await import('../../i18n/config')).default;
    await i18n.changeLanguage('de');
    const { container } = render(<MemoryRouter><ChangelogPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Changelog');
    expect(container.querySelector('[lang="en"]')).not.toBeNull();
    expect(screen.getAllByTestId('changelog-release')).toHaveLength(PUBLIC_CHANGELOG.length);
    expect(screen.getByText(PUBLIC_CHANGELOG[0].title)).toBeInTheDocument();
  });
});
