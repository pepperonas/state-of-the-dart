import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Users, TrendingUp, Trophy, Award, Dumbbell, Settings, Medal, Shield, BookOpen, RotateCcw, Mail, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import UserMenu from './auth/UserMenu';
import SyncStatus from './sync/SyncStatus';
import UserGuideModal from './guide/UserGuideModal';
import ContactModal from './contact/ContactModal';
import { getLocalGameSummaries } from '../utils/gameStorage';
import { enterDrop, staggerChild, springSpatialFast } from '../utils/motion';

/** M3 tonal presets — full class strings (Tailwind JIT can't see interpolated names). */
type Tone = 'primary' | 'secondary' | 'tertiary' | 'success' | 'error';
const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  success: 'bg-success-container text-on-success-container',
  error: 'bg-error-container text-on-error-container',
};

const MainMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, storage } = useTenant();
  const { user } = useAuth();

  // Count all paused/in-progress matches from DB (for resume badge)
  const [resumableMatchCount, setResumableMatchCount] = useState(0);

  useEffect(() => {
    const localCount = getLocalGameSummaries().length;
    api.matches.getResumable()
      .then((data: any) => {
        setResumableMatchCount((data as any[]).length + localCount);
      })
      .catch(() => {
        setResumableMatchCount(localCount);
      });
  }, []);

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  type MenuItem = {
    title: string;
    icon: typeof Target;
    description: string;
    onClick: () => void;
    tone: Tone;
    badge?: number;
  };

  const menuItems: MenuItem[] = [
    { title: t('menu.dashboard'), icon: TrendingUp, description: t('menu.dashboard_desc'), onClick: () => navigate('/dashboard'), tone: 'primary' },
    { title: t('menu.quick_match'), icon: Target, description: t('menu.quick_match_desc'), onClick: () => navigate('/game?new=1'), tone: 'tertiary' },
    ...(resumableMatchCount > 0
      ? [{ title: t('resume.menu_title'), icon: RotateCcw, description: t('resume.menu_desc', { count: resumableMatchCount }), onClick: () => navigate('/resume'), tone: 'success' as Tone, badge: resumableMatchCount }]
      : []),
    { title: t('menu.cricket'), icon: Target, description: t('menu.cricket_desc'), onClick: () => navigate('/cricket'), tone: 'success' },
    { title: t('menu.around_the_clock'), icon: Target, description: t('menu.around_the_clock_desc'), onClick: () => navigate('/around-the-clock'), tone: 'secondary' },
    { title: t('menu.shanghai'), icon: Target, description: t('menu.shanghai_desc'), onClick: () => navigate('/shanghai'), tone: 'tertiary' },
    { title: t('menu.online_multiplayer'), icon: Target, description: t('menu.online_multiplayer_desc'), onClick: () => navigate('/online'), tone: 'tertiary' },
    { title: t('menu.players'), icon: Users, description: t('menu.players_desc'), onClick: () => navigate('/players'), tone: 'secondary' },
    { title: t('menu.statistics'), icon: TrendingUp, description: t('menu.statistics_desc'), onClick: () => navigate('/stats'), tone: 'primary' },
    { title: t('menu.match_history'), icon: ClipboardList, description: t('menu.match_history_desc'), onClick: () => navigate('/match-history'), tone: 'secondary' },
    { title: t('menu.achievements'), icon: Award, description: t('menu.achievements_desc'), onClick: () => navigate('/achievements'), tone: 'tertiary' },
    { title: t('menu.leaderboard'), icon: Medal, description: t('menu.leaderboard_desc'), onClick: () => navigate('/leaderboard'), tone: 'primary' },
    { title: t('menu.global_leaderboard'), icon: Trophy, description: t('menu.global_leaderboard_desc'), onClick: () => navigate('/global-leaderboard'), tone: 'tertiary' },
    { title: t('menu.tournaments'), icon: Trophy, description: t('menu.tournaments_desc'), onClick: () => navigate('/tournament'), tone: 'secondary' },
    { title: t('menu.training'), icon: Dumbbell, description: t('menu.training_desc'), onClick: () => navigate('/training'), tone: 'success' },
    { title: t('menu.settings'), icon: Settings, description: t('menu.settings_desc'), onClick: () => navigate('/settings'), tone: 'secondary' },
    { title: t('menu.guide'), icon: BookOpen, description: t('menu.guide_desc'), onClick: () => setShowGuideModal(true), tone: 'primary' },
    { title: t('menu.contact'), icon: Mail, description: t('menu.contact_desc'), onClick: () => setShowContactModal(true), tone: 'secondary' },
  ];

  // Add Admin Panel button only if user is admin
  if (user?.isAdmin) {
    menuItems.push({ title: t('menu.admin_panel'), icon: Shield, description: t('menu.admin_panel_desc'), onClick: () => navigate('/admin'), tone: 'error' });
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-menu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary-container focus:text-on-primary-container focus:rounded-m3-md"
      >
        Skip to main menu
      </a>
      <div className="max-w-6xl mx-auto" id="main-menu">
        <motion.div {...enterDrop} className="text-center mb-10">
          <div className="flex items-center justify-end mb-6 gap-3">
            <SyncStatus />
            <UserMenu />
          </div>

          <h1
            className="m3-display-medium font-bold mb-3"
            style={{
              background: 'linear-gradient(135deg, var(--m3-primary), var(--m3-tertiary))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {t('common.app_name')}
          </h1>
          <p className="m3-title-medium text-on-surface-variant font-normal">
            {i18n.language === 'de' ? 'Professionelles Dart Zählsystem' : 'Professional Dart Scoring System'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.title}
                {...staggerChild(index)}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={springSpatialFast}
                onClick={item.onClick}
                className="m3-card m3-elevated m3-interactive m3-state-layer text-left p-5 relative overflow-hidden"
              >
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute top-3 right-3 z-10 bg-error text-on-error m3-label-medium font-bold min-w-6 h-6 px-2 flex items-center justify-center rounded-m3-full">
                    {item.badge}
                  </span>
                )}
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-m3-lg flex items-center justify-center ${TONE_CHIP[item.tone]}`}>
                    <Icon size={30} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="m3-title-large text-on-surface mb-0.5 truncate">{item.title}</h2>
                    <p className="m3-body-medium text-on-surface-variant line-clamp-2">{item.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {showGuideModal && <UserGuideModal onClose={() => setShowGuideModal(false)} />}
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}
    </div>
  );
};

export default MainMenu;
