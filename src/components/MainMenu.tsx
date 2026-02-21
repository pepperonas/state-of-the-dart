import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Users, TrendingUp, Trophy, Award, Dumbbell, Settings, Play, LogOut, Medal, Shield, BookOpen, RotateCcw, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import UserMenu from './auth/UserMenu';
import SyncStatus from './sync/SyncStatus';
import UserGuideModal from './guide/UserGuideModal';
import ContactModal from './contact/ContactModal';

const MainMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, storage } = useTenant();
  const { user } = useAuth();

  // Count all paused/in-progress matches from DB (for resume badge)
  const [resumableMatchCount, setResumableMatchCount] = useState(0);

  useEffect(() => {
    api.matches.getResumable()
      .then((data: any) => {
        setResumableMatchCount((data as any[]).length);
      })
      .catch(() => {});
  }, []);

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const menuItems = [
    {
      title: t('menu.dashboard'),
      icon: TrendingUp,
      description: t('menu.dashboard_desc'),
      onClick: () => navigate('/dashboard'),
      gradient: 'from-primary-600 to-accent-600',
    },
    {
      title: t('menu.quick_match'),
      icon: Target,
      description: t('menu.quick_match_desc'),
      onClick: () => navigate('/game?new=1'),
      gradient: 'from-primary-500 to-primary-600',
    },
    ...(resumableMatchCount > 0
      ? [{
          title: t('resume.menu_title'),
          icon: RotateCcw,
          description: t('resume.menu_desc', { count: resumableMatchCount }),
          onClick: () => navigate('/resume'),
          gradient: 'from-amber-500 to-orange-500',
          badge: resumableMatchCount,
        }]
      : []),
    {
      title: '🎯 ' + t('menu.cricket'),
      icon: Target,
      description: t('menu.cricket_desc'),
      onClick: () => navigate('/cricket'),
      gradient: 'from-green-500 to-green-600',
    },
    {
      title: '🕐 ' + t('menu.around_the_clock'),
      icon: Target,
      description: t('menu.around_the_clock_desc'),
      onClick: () => navigate('/around-the-clock'),
      gradient: 'from-cyan-500 to-cyan-600',
    },
    {
      title: '⚡ ' + t('menu.shanghai'),
      icon: Target,
      description: t('menu.shanghai_desc'),
      onClick: () => navigate('/shanghai'),
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      title: '🌐 ' + t('menu.online_multiplayer'),
      icon: Target,
      description: t('menu.online_multiplayer_desc'),
      onClick: () => navigate('/online'),
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: t('menu.players'),
      icon: Users,
      description: t('menu.players_desc'),
      onClick: () => navigate('/players'),
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      title: t('menu.statistics'),
      icon: TrendingUp,
      description: t('menu.statistics_desc'),
      onClick: () => navigate('/stats'),
      gradient: 'from-primary-600 to-accent-600',
    },
    {
      title: t('menu.achievements'),
      icon: Award,
      description: t('menu.achievements_desc'),
      onClick: () => navigate('/achievements'),
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      title: t('menu.leaderboard'),
      icon: Medal,
      description: t('menu.leaderboard_desc'),
      onClick: () => navigate('/leaderboard'),
      gradient: 'from-amber-600 to-amber-700',
    },
    {
      title: t('menu.global_leaderboard'),
      icon: Trophy,
      description: t('menu.global_leaderboard_desc'),
      onClick: () => navigate('/global-leaderboard'),
      gradient: 'from-primary-600 to-accent-600',
    },
    {
      title: t('menu.tournaments'),
      icon: Trophy,
      description: t('menu.tournaments_desc'),
      onClick: () => navigate('/tournament'),
      gradient: 'from-accent-600 to-accent-700',
    },
    {
      title: t('menu.training'),
      icon: Dumbbell,
      description: t('menu.training_desc'),
      onClick: () => navigate('/training'),
      gradient: 'from-success-500 to-success-600',
    },
    {
      title: t('menu.settings'),
      icon: Settings,
      description: t('menu.settings_desc'),
      onClick: () => navigate('/settings'),
      gradient: 'from-dark-600 to-dark-700',
    },
    {
      title: t('menu.guide'),
      icon: BookOpen,
      description: t('menu.guide_desc'),
      onClick: () => setShowGuideModal(true),
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: t('menu.contact'),
      icon: Mail,
      description: t('menu.contact_desc'),
      onClick: () => setShowContactModal(true),
      gradient: 'from-teal-500 to-teal-600',
    },
  ];

  // Add Admin Panel button only if user is admin
  if (user?.isAdmin) {
    menuItems.push({
      title: '👑 ' + t('menu.admin_panel'),
      icon: Shield,
      description: t('menu.admin_panel_desc'),
      onClick: () => navigate('/admin'),
      gradient: 'from-amber-500 to-amber-700',
    });
  }
  
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
          <div className="flex items-center justify-end mb-6 gap-3">
            <SyncStatus />
            <UserMenu />
          </div>
          
          <div className="inline-block px-8 py-4 rounded-2xl bg-dark-900/40 backdrop-blur-sm border border-white/10 shadow-2xl mb-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white" style={{ textShadow: '0 0 40px rgba(14, 165, 233, 0.6), 0 0 20px rgba(168, 85, 247, 0.4), 0 4px 8px rgba(0, 0, 0, 0.8)' }}>
              {t('common.app_name')}
            </h1>
          </div>
          <p className="text-xl text-white font-light mt-4" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>
            {i18n.language === 'de' ? 'Professionelles Dart Zählsystem' : 'Professional Dart Scoring System'}
          </p>
        </motion.div>
        
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
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${item.gradient} shadow-lg relative`}>
                    <Icon size={40} className="text-white" />
                    {'badge' in item && (item as any).badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                        {(item as any).badge}
                      </span>
                    )}
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
      </div>

      {showGuideModal && (
        <UserGuideModal onClose={() => setShowGuideModal(false)} />
      )}

      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}
    </div>
  );
};

export default MainMenu;