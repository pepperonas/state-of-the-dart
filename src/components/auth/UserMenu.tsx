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
        className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:glass-card-hover transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-dark-400">
            {hasActiveSubscription ? (
              <span className="flex items-center gap-1">
                {user.subscriptionStatus === 'lifetime' ? (
                  <>
                    <Crown size={12} className="text-amber-400" />
                    <span className="text-amber-400">Lifetime</span>
                  </>
                ) : (
                  <>
                    <span className="text-success-400">Aktiv</span>
                  </>
                )}
              </span>
            ) : user.subscriptionStatus === 'trial' ? (
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-primary-400" />
                <span className="text-primary-400">{trialDaysLeft} Tage Trial</span>
              </span>
            ) : (
              <span className="text-error-400">Kein Abo</span>
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
          <div className="absolute right-0 mt-2 w-56 glass-card rounded-lg shadow-xl border border-dark-600 z-50 overflow-hidden">
            {/* User Info */}
            <div className="p-4 border-b border-dark-600">
              <p className="font-medium text-white">{user.name}</p>
              <p className="text-sm text-dark-400 truncate">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  navigate('/settings');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-white hover:bg-dark-800 transition-colors"
              >
                <Settings size={18} />
                Einstellungen
              </button>

              <button
                onClick={() => {
                  navigate('/pricing');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-white hover:bg-dark-800 transition-colors"
              >
                <CreditCard size={18} />
                {hasActiveSubscription ? 'Abo verwalten' : 'Upgrade'}
              </button>

              <div className="border-t border-dark-600 my-2" />

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left flex items-center gap-2 text-error-400 hover:bg-dark-800 transition-colors"
              >
                <LogOut size={18} />
                Abmelden
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
