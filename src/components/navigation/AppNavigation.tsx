import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, TrendingUp, Users, Award, CircleUserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { showsAppNavigation } from './navVisibility';
import { navSection, type NavSection } from './navSection';
import ReportActions from '../bugReport/ReportActions';

const DESTINATIONS: Array<{ to: string; key: string; icon: typeof Home; section: NavSection }> = [
  { to: '/', key: 'nav.home', icon: Home, section: 'home' },
  { to: '/stats', key: 'nav.stats', icon: TrendingUp, section: 'stats' },
  { to: '/achievements', key: 'nav.achievements', icon: Award, section: 'achievements' },
  { to: '/players', key: 'nav.players', icon: Users, section: 'players' },
  // 0.47.0: settings, account, subscription and help — one tap from everywhere.
  { to: '/me', key: 'nav.account', icon: CircleUserRound, section: 'account' },
];

/**
 * M3 navigation: a bottom bar on phones, a rail from tablet width up.
 * The app used to be a grid of tiles with a back button on every screen —
 * reaching the statistics from a sub-page meant going home first.
 */
const AppNavigation: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  if (!showsAppNavigation(pathname, isAuthenticated)) return null;

  // A sub-page lights up the destination it belongs to (navSection).
  const current = navSection(pathname);
  const item = (layout: 'bar' | 'rail') =>
    DESTINATIONS.map(({ to, key, icon: Icon, section }) => {
      const isActive = section === current;
      return (
      <Link
        key={to}
        to={to}
        aria-current={isActive ? 'page' : undefined}
        data-testid={`nav-${section}`}
        className={`group flex flex-col items-center gap-1 min-w-0 ${layout === 'bar' ? 'flex-1 py-3' : 'w-full py-2'} m3-label-medium ${
          isActive ? 'text-on-surface' : 'text-on-surface-variant'
        }`}
      >
          <>
            {/* M3 active indicator: a pill behind the icon that widens in. */}
            <span
              className={`grid place-items-center h-8 rounded-m3-full transition duration-300 ${
                isActive ? 'w-16 bg-secondary-container text-on-secondary-container' : 'w-12 group-hover:bg-surface-container-highest'
              }`}
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className={`max-w-full truncate px-1 ${isActive ? 'font-semibold' : ''}`}>{t(key)}</span>
          </>
      </Link>
      );
    });

  return (
    <>
      <nav
        aria-label={t('nav.label')}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-surface-container shadow-m3-2 pb-[env(safe-area-inset-bottom)]"
      >
        {item('bar')}
      </nav>
      <nav
        aria-label={t('nav.label')}
        className="hidden md:flex fixed left-0 inset-y-0 z-40 w-20 flex-col items-center gap-3 pt-8 pb-4 bg-surface-container"
      >
        {item('rail')}
        {/* Report actions at the foot of the rail — never over the content (0.43.0). */}
        <ReportActions layout="rail" className="mt-auto" />
      </nav>
    </>
  );
};

export default AppNavigation;
