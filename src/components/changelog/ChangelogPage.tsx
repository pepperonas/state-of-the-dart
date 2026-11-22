import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import PageShell from '../common/PageShell';
import { PUBLIC_CHANGELOG } from '../../data/publicChangelog';
import { formatReleaseDate } from '../../utils/releaseDate';

/**
 * The public changelog (0.50.0). English only, on purpose: it is written once,
 * for players, without internals — the developer changelog stays in the repo.
 * `lang="en"` lets a screen reader read it in English whatever the app speaks.
 */
const ChangelogPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const en = (key: string) => t(key, { lng: 'en' });

  return (
    <PageShell
      title={en('changelog.title')}
      subtitle={en('changelog.subtitle')}
      icon={<History size={28} aria-hidden="true" />}
      width="md"
      onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
    >
      <div lang="en" className="space-y-4" data-testid="changelog">
        {PUBLIC_CHANGELOG.map(r => (
          <article
            key={r.version}
            aria-labelledby={`release-${r.version}`}
            className="m3-card m3-filled rounded-m3-lg bg-surface-container p-4 sm:p-5"
            data-testid="changelog-release"
          >
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <h2 id={`release-${r.version}`} className="m3-title-large text-on-surface">{r.title}</h2>
              <span className="m3-label-large text-primary tabular-nums">{r.version}</span>
              <time dateTime={r.date} className="m3-label-medium text-on-surface-variant ml-auto">{formatReleaseDate(r.date)}</time>
            </header>
            <ul className="list-disc pl-5 space-y-1 m3-body-medium text-on-surface-variant">
              {r.items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </PageShell>
  );
};

export default ChangelogPage;
