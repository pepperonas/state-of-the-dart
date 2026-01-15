import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Users, TrendingUp, Trophy, Award, Dumbbell, Settings, Play, LogOut, Medal } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import UserMenu from './auth/UserMenu';
import SyncStatus from './sync/SyncStatus';
import packageJson from '../../package.json';

const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, storage } = useTenant();
  // Compute hasSavedMatch directly from storage
  const hasSavedMatch = React.useMemo(() => {
    if (storage) {
      const savedMatch = storage.get<{status?: string} | null>('currentMatch', null);
      return !!savedMatch && savedMatch.status === 'in-progress';
    }
    return false;
  }, [storage]);
  
  const menuItems = [
    {
      title: 'Dashboard',
      icon: TrendingUp,
      description: 'View your activity',
      onClick: () => navigate('/dashboard'),
      gradient: 'from-primary-600 to-accent-600',
    },
    {
      title: 'Quick Game',
      icon: Target,
      description: 'Start a quick game of 501',
      onClick: () => navigate('/game'),
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      title: 'Players',
      icon: Users,
      description: 'Manage player profiles',
      onClick: () => navigate('/players'),
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      title: 'Statistics',
      icon: TrendingUp,
      description: 'View stats and history',
      onClick: () => navigate('/stats'),
      gradient: 'from-primary-600 to-accent-600',
    },
    {
      title: 'Achievements',
      icon: Award,
      description: 'Unlock and view achievements',
      onClick: () => navigate('/achievements'),
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      title: 'Leaderboard',
      icon: Medal,
      description: 'Rankings and competitions',
      onClick: () => navigate('/leaderboard'),
      gradient: 'from-amber-600 to-amber-700',
    },
    {
      title: 'Global Leaderboard',
      icon: Trophy,
      description: 'Compete worldwide',
      onClick: () => navigate('/global-leaderboard'),
      gradient: 'from-primary-600 to-accent-600',
    },
    {
      title: 'Tournament',
      icon: Trophy,
      description: 'Create or join tournaments',
      onClick: () => navigate('/tournament'),
      gradient: 'from-accent-600 to-accent-700',
    },
    {
      title: 'Training',
      icon: Dumbbell,
      description: 'Practice and improve',
      onClick: () => navigate('/training'),
      gradient: 'from-success-500 to-success-600',
    },
    {
      title: 'Settings',
      icon: Settings,
      description: 'Configure app settings',
      onClick: () => navigate('/settings'),
      gradient: 'from-dark-600 to-dark-700',
    },
  ];
  
  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-menu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary-500 focus:text-white focus:rounded"
      >
        Skip to main menu
      </a>
      <div className="max-w-6xl mx-auto" id="main-menu">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                {currentTenant?.avatar}
              </div>
              <div className="text-left">
                <p className="text-sm text-dark-400">Aktuelles Profil</p>
                <p className="text-lg font-semibold text-white">{currentTenant?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SyncStatus />
              <UserMenu />
              <button
                onClick={() => setCurrentTenant(null)}
                className="flex items-center gap-2 px-4 py-2 glass-card hover:glass-card-hover rounded-lg text-white border border-white/10 transition-all"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">Profil wechseln</span>
              </button>
            </div>
          </div>
          
          <div className="inline-block px-8 py-4 rounded-2xl bg-dark-900/40 backdrop-blur-sm border border-white/10 shadow-2xl mb-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white" style={{ textShadow: '0 0 40px rgba(14, 165, 233, 0.6), 0 0 20px rgba(168, 85, 247, 0.4), 0 4px 8px rgba(0, 0, 0, 0.8)' }}>
              State of the Dart
            </h1>
          </div>
          <p className="text-xl text-white font-light mt-4" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>
            Professional Dart Scoring System
          </p>
        </motion.div>
        
        {hasSavedMatch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => navigate('/game')}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all"
            >
              <Play size={24} />
              Match fortsetzen
            </button>
          </motion.div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, rotate: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={item.onClick}
                className="glass-card rounded-2xl p-6 shadow-lg transform transition-all duration-200 relative overflow-hidden group border border-white/5 card-hover-effect"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="flex flex-col items-center space-y-4 relative z-10">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${item.gradient} shadow-lg`}>
                    <Icon size={40} className="text-white" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-1">{item.title}</h2>
                    <p className="text-sm text-dark-400">{item.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
        
        <div className="mt-12 text-center space-y-2">
          <p className="text-sm text-dark-500">
            © 2026 Martin Pfeffer | celox.io
          </p>
          <p className="text-xs text-dark-600">
            Version {packageJson.version}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;