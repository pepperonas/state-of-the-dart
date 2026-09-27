import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, TrendingUp, Users, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { showsAppNavigation } from './navVisibility';

const DESTINATIONS = [
  { to: '/', key: 'nav.home', icon: Home, end: true },
  { to: '/stats', key: 'nav.stats', icon: TrendingUp, end: false },
  { to: '/achievements', key: 'nav.achievements', icon: Award, end: false },
  { to: '/players', key: 'nav.players', icon: Users, end: false },
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

  const item = (layout: 'bar' | 'rail') =>
    DESTINATIONS.map(({ to, key, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) =>
          `group flex flex-col items-center gap-1 ${layout === 'bar' ? 'flex-1 py-3' : 'w-full py-2'} m3-label-medium ${
            isActive ? 'text-on-surface' : 'text-on-surface-variant'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {/* M3 active indicator: a pill behind the icon that widens in. */}
            <span
              className={`grid place-items-center h-8 rounded-m3-full transition duration-300 ${
                isActive ? 'w-16 bg-secondary-container text-on-secondary-container' : 'w-12 group-hover:bg-surface-container-highest'
              }`}
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className={isActive ? 'font-semibold' : ''}>{t(key)}</span>
          </>
        )}
      </NavLink>
    ));

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
        className="hidden md:flex fixed left-0 inset-y-0 z-40 w-20 flex-col items-center gap-3 pt-8 bg-surface-container"
      >
        {item('rail')}
      </nav>
    </>
  );
};

export default AppNavigation;
