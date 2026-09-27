import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, CreditCard, Crown, Clock, BookOpen, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Menu, { type MenuItem } from '../common/Menu';

interface UserMenuProps {
  /** Guide and contact moved here from the home-screen tile grid. */
  onOpenGuide?: () => void;
  onOpenContact?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onOpenGuide, onOpenContact }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, hasActiveSubscription, trialDaysLeft } = useAuth();
  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const go = (path: string) => () => navigate(path);
  const items: MenuItem[] = [
    ...(user.subscriptionStatus === 'trial' && trialDaysLeft > 0
      ? [{ id: 'upgrade', label: t('user_menu.upgrade_now'), icon: <Crown size={18} />, onSelect: go('/pricing'), tone: 'primary' as const }]
      : []),
    { id: 'account', label: t('user_menu.account'), icon: <User size={18} />, onSelect: go('/account') },
    { id: 'settings', label: t('user_menu.app_settings'), icon: <Settings size={18} />, onSelect: go('/settings') },
    {
      id: 'pricing',
      label: user.subscriptionStatus === 'lifetime' ? t('user_menu.lifetime_license') : hasActiveSubscription ? t('user_menu.manage_subscription') : t('user_menu.upgrade'),
      icon: <CreditCard size={18} />,
      onSelect: go('/pricing'),
    },
    ...(onOpenGuide ? [{ id: 'guide', label: t('menu.guide'), icon: <BookOpen size={18} />, onSelect: onOpenGuide }] : []),
    ...(onOpenContact ? [{ id: 'contact', label: t('menu.contact'), icon: <Mail size={18} />, onSelect: onOpenContact }] : []),
    { id: 'logout', label: t('auth.logout'), icon: <LogOut size={18} />, onSelect: handleLogout, tone: 'danger' },
  ];

  return (
    <Menu
      label={t('home.account_menu')}
      triggerLabel={t('home.account_menu')}
      triggerClassName="flex items-center gap-2 bg-surface-container px-4 py-2 rounded-m3-full shadow-m3-1 hover:bg-surface-container-high transition"
      items={items}
      header={
        <div className="p-4 border-b border-outline-variant">
          <p className="m3-label-large text-on-surface">{user.name}</p>
          <p className="m3-body-small text-on-surface-variant truncate">{user.email}</p>
          {user.subscriptionStatus === 'trial' && trialDaysLeft > 0 && (
            <p className="mt-2 flex items-center gap-2 m3-label-large text-primary">
              <Clock size={16} aria-hidden="true" />
              {t('user_menu.trial_remaining', { count: trialDaysLeft })}
            </p>
          )}
        </div>
      }
    >
        <div className="w-8 h-8 rounded-m3-full bg-primary text-on-primary flex items-center justify-center font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <p className="m3-label-large text-on-surface">{user.name}</p>
          <p className="m3-body-small text-on-surface-variant">
            {hasActiveSubscription ? (
              <span className="flex items-center gap-1">
                {user.subscriptionStatus === 'lifetime' ? (
                  <>
                    <Crown size={12} className="text-tertiary" />
                    <span className="text-tertiary">{t('user_menu.lifetime')}</span>
                  </>
                ) : (
                  <>
                    <span className="text-success">{t('user_menu.active')}</span>
                  </>
                )}
              </span>
            ) : user.subscriptionStatus === 'trial' ? (
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-primary" />
                <span className="text-primary">{t('user_menu.trial_days', { count: trialDaysLeft })}</span>
              </span>
            ) : (
              <span className="text-error">{t('user_menu.no_subscription')}</span>
            )}
          </p>
        </div>
    </Menu>
  );
};

export default UserMenu;
