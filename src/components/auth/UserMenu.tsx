import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, CreditCard, Crown, Clock, BookOpen, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface UserMenuProps {
  /** Guide and contact moved here from the home-screen tile grid. */
  onOpenGuide?: () => void;
  onOpenContact?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onOpenGuide, onOpenContact }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, hasActiveSubscription, trialDaysLeft } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative">
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('home.account_menu')}
        className="flex items-center gap-2 bg-surface-container px-4 py-2 rounded-m3-full shadow-m3-1 hover:bg-surface-container-high transition-all"
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
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            data-backdrop
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-56 bg-surface-container-high rounded-m3-md shadow-m3-2 border border-outline-variant z-50 overflow-hidden m3-enter-drop">
            {/* User Info */}
            <div className="p-4 border-b border-outline-variant">
              <p className="m3-label-large text-on-surface">{user.name}</p>
              <p className="m3-body-small text-on-surface-variant truncate">{user.email}</p>
            </div>

            {/* Trial/Subscription Banner */}
            {user.subscriptionStatus === 'trial' && trialDaysLeft > 0 && (
              <div className="px-3 py-3 bg-primary-container border-b border-outline-variant">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-on-primary-container" />
                  <span className="m3-label-large text-on-primary-container">
                    {t('user_menu.trial_remaining', { count: trialDaysLeft })}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigate('/pricing');
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-primary text-on-primary m3-label-large rounded-m3-full transition-all flex items-center justify-center gap-2 hover:shadow-m3-1"
                >
                  <Crown size={16} />
                  {t('user_menu.upgrade_now')}
                </button>
              </div>
            )}

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  navigate('/account');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <User size={18} />
                {t('user_menu.account')}
              </button>

              <button
                onClick={() => {
                  navigate('/settings');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <Settings size={18} />
                {t('user_menu.app_settings')}
              </button>

              <button
                onClick={() => {
                  navigate('/pricing');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <CreditCard size={18} />
                {user.subscriptionStatus === 'lifetime' ? t('user_menu.lifetime_license') : hasActiveSubscription ? t('user_menu.manage_subscription') : t('user_menu.upgrade')}
              </button>

              {onOpenGuide && (
                <button
                  onClick={() => { onOpenGuide(); setIsOpen(false); }}
                  className="w-full px-4 py-2 text-left flex items-center gap-2 text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  <BookOpen size={18} />
                  {t('menu.guide')}
                </button>
              )}
              {onOpenContact && (
                <button
                  onClick={() => { onOpenContact(); setIsOpen(false); }}
                  className="w-full px-4 py-2 text-left flex items-center gap-2 text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  <Mail size={18} />
                  {t('menu.contact')}
                </button>
              )}

              <div className="border-t border-outline-variant my-2" />

              <div className="px-2 pb-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 flex items-center justify-center gap-3 text-error hover:bg-error-container rounded-m3-md m3-label-large transition-colors"
                >
                  <LogOut size={20} className="flex-shrink-0" />
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
