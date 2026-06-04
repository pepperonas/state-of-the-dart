import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, CreditCard, Crown, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, hasActiveSubscription, trialDaysLeft } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

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
                    <span className="text-tertiary">Lifetime</span>
                  </>
                ) : (
                  <>
                    <span className="text-success">Aktiv</span>
                  </>
                )}
              </span>
            ) : user.subscriptionStatus === 'trial' ? (
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-primary" />
                <span className="text-primary">{trialDaysLeft} Tage Trial</span>
              </span>
            ) : (
              <span className="text-error">Kein Abo</span>
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
          />
          <div className="absolute right-0 mt-2 w-56 bg-surface-container-high rounded-m3-md shadow-m3-2 border border-outline-variant z-50 overflow-hidden">
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
                    Noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'} Premium-Trial
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
                  Jetzt upgraden
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
                Account
              </button>

              <button
                onClick={() => {
                  navigate('/settings');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <Settings size={18} />
                App Einstellungen
              </button>

              <button
                onClick={() => {
                  navigate('/pricing');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <CreditCard size={18} />
                {user.subscriptionStatus === 'lifetime' ? 'Lifetime-Lizenz' : hasActiveSubscription ? 'Abo verwalten' : 'Upgrade'}
              </button>

              <div className="border-t border-outline-variant my-2" />

              <div className="px-2 pb-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 flex items-center justify-center gap-3 text-error hover:bg-error-container rounded-m3-md m3-label-large transition-colors"
                >
                  <LogOut size={20} className="flex-shrink-0" />
                  Abmelden
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
