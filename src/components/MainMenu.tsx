import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Users, TrendingUp, Trophy, Award, Dumbbell, Medal, Shield, RotateCcw, ClipboardList, Play, Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import UserMenu from './auth/UserMenu';
import SyncStatus from './sync/SyncStatus';
import UserGuideModal from './guide/UserGuideModal';
import ContactModal from './contact/ContactModal';
import { getLocalGameSummaries } from '../utils/gameStorage';
import { enterDrop, staggerChild, springSpatialFast } from '../utils/motion';
import { loadLastGameSettings } from '../utils/matchSetup';
import InstallCard from '../pwa/InstallCard';
import OnboardingCard from './onboarding/OnboardingCard';

/** M3 tonal presets — full class strings (Tailwind JIT can't see interpolated names). */
type Tone = 'primary' | 'secondary' | 'tertiary' | 'success' | 'error';
const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  success: 'bg-success-container text-on-success-container',
  error: 'bg-error-container text-on-error-container',
};

type MenuItem = {
  title: string;
  icon: typeof Target;
  description: string;
  onClick: () => void;
  tone: Tone;
  /** Shown as a "Beta" label — works partly, not finished. */
  beta?: boolean;
};

/**
 * The home screen.
 *
 * It used to be 17 tiles of equal weight with the dashboard first; starting the
 * usual 501 against the usual opponent took about seven taps plus the spinner.
 * Now the one thing people come for — play again — is a single large button,
 * a paused game sits right next to it, and the rest is grouped.
 */
const MainMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storage } = useTenant();
  const { user } = useAuth();
  const { players } = usePlayer();

  const [resumableMatchCount, setResumableMatchCount] = useState(0);
  useEffect(() => {
    const localCount = getLocalGameSummaries().length;
    api.matches.getResumable()
      .then((data: unknown) => setResumableMatchCount((data as unknown[]).length + localCount))
      .catch(() => setResumableMatchCount(localCount));
  }, []);

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // The pairing and settings of the last X01 match — the rematch button.
  const lastPlayers = useMemo(() => {
    const ids = storage?.get<string[]>('lastPlayerIds', []) ?? [];
    return ids.map(id => players.find(p => p.id === id)).filter(Boolean) as typeof players;
  }, [storage, players]);
  const last = loadLastGameSettings();
  const settingsLine = [
    last.startScore,
    last.doubleOut ? t('game.double_out') : null,
    (last.setsToWin ?? 1) > 1
      ? t('home.first_to_sets', { count: last.setsToWin })
      : t('home.first_to_legs', { count: last.legsToWin }),
  ].filter(Boolean).join(' · ');

  const sections: Array<{ id: string; title: string; items: MenuItem[] }> = [
    {
      id: 'play',
      title: t('home.section_play'),
      items: [
        { title: t('menu.cricket'), icon: Target, description: t('menu.cricket_desc'), onClick: () => navigate('/cricket'), tone: 'success' },
        { title: t('menu.around_the_clock'), icon: Target, description: t('menu.around_the_clock_desc'), onClick: () => navigate('/around-the-clock'), tone: 'secondary' },
        { title: t('menu.shanghai'), icon: Target, description: t('menu.shanghai_desc'), onClick: () => navigate('/shanghai'), tone: 'tertiary' },
        { title: t('menu.training'), icon: Dumbbell, description: t('menu.training_desc'), onClick: () => navigate('/training'), tone: 'success' },
        { title: t('menu.tournaments'), icon: Trophy, description: t('menu.tournaments_desc'), onClick: () => navigate('/tournament'), tone: 'secondary' },
        { title: t('menu.online_multiplayer'), icon: Target, description: t('menu.online_multiplayer_desc'), onClick: () => navigate('/online'), tone: 'tertiary', beta: true },
      ],
    },
    {
      id: 'review',
      title: t('home.section_review'),
      items: [
        { title: t('menu.dashboard'), icon: TrendingUp, description: t('menu.dashboard_desc'), onClick: () => navigate('/dashboard'), tone: 'primary' },
        { title: t('menu.match_history'), icon: ClipboardList, description: t('menu.match_history_desc'), onClick: () => navigate('/match-history'), tone: 'secondary' },
        { title: t('menu.leaderboard'), icon: Medal, description: t('menu.leaderboard_desc'), onClick: () => navigate('/leaderboard'), tone: 'primary' },
        { title: t('menu.global_leaderboard'), icon: Trophy, description: t('menu.global_leaderboard_desc'), onClick: () => navigate('/global-leaderboard'), tone: 'tertiary' },
        { title: t('menu.achievements'), icon: Award, description: t('menu.achievements_desc'), onClick: () => navigate('/achievements'), tone: 'tertiary' },
      ],
    },
  ];
  if (user?.isAdmin) {
    sections.push({
      id: 'admin',
      title: t('home.section_admin'),
      items: [{ title: t('menu.admin_panel'), icon: Shield, description: t('menu.admin_panel_desc'), onClick: () => navigate('/admin'), tone: 'error' }],
    });
  }

  let staggerIndex = 0;

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <a
        href="#main-menu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary-container focus:text-on-primary-container focus:rounded-m3-md"
      >
        {t('home.skip_to_content')}
      </a>
      <div className="max-w-6xl mx-auto" id="main-menu">
        <motion.header {...enterDrop} className="flex items-center justify-between gap-3 mb-6">
          <h1 className="m3-headline-medium font-bold text-on-surface truncate">
            {t('common.app_name')}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <SyncStatus />
            <UserMenu onOpenGuide={() => setShowGuideModal(true)} onOpenContact={() => setShowContactModal(true)} />
          </div>
        </motion.header>

        <OnboardingCard />
        <InstallCard />

        {/* Primary actions: play again, continue */}
        <div className={`grid gap-4 mb-4 ${resumableMatchCount > 0 ? 'md:grid-cols-[2fr_1fr]' : ''}`}>
          <motion.button
            {...staggerChild(staggerIndex++)}
            whileTap={{ scale: 0.98 }}
            transition={springSpatialFast}
            onClick={() => navigate(lastPlayers.length > 0 ? '/game?new=1&quick=1' : '/game?new=1')}
            className="m3-state-layer text-left p-6 rounded-m3-xl bg-primary text-on-primary shadow-m3-2 relative overflow-hidden"
          >
            <span className="flex items-center gap-5">
              <span className="shrink-0 w-16 h-16 rounded-m3-lg bg-[color-mix(in_srgb,var(--m3-on-primary)_16%,transparent)] grid place-items-center">
                <Play size={32} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block m3-headline-small font-bold">
                  {lastPlayers.length > 0 ? t('home.rematch') : t('home.new_game')}
                </span>
                <span className="block m3-body-large opacity-90 truncate">
                  {lastPlayers.length > 0 ? lastPlayers.map(p => p.name).join(' vs. ') : t('menu.quick_match_desc')}
                </span>
                <span className="block m3-label-large opacity-80 mt-1">{settingsLine}</span>
              </span>
            </span>
          </motion.button>

          {resumableMatchCount > 0 && (
            <motion.button
              {...staggerChild(staggerIndex++)}
              whileTap={{ scale: 0.98 }}
              transition={springSpatialFast}
              onClick={() => navigate('/resume')}
              className="m3-state-layer text-left p-6 rounded-m3-xl bg-success-container text-on-success-container shadow-m3-1"
            >
              <span className="flex items-center gap-4">
                <RotateCcw size={28} aria-hidden="true" />
                <span>
                  <span className="block m3-title-large font-semibold">{t('resume.menu_title')}</span>
                  <span className="block m3-body-medium">{t('resume.menu_desc', { count: resumableMatchCount })}</span>
                </span>
              </span>
            </motion.button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {lastPlayers.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/game?new=1')}
              className="m3-state-layer inline-flex items-center gap-2 min-h-[40px] px-4 rounded-m3-full border border-outline text-on-surface m3-label-large"
            >
              <Plus size={18} aria-hidden="true" />
              {t('home.new_setup')}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/players')}
            className="m3-state-layer inline-flex items-center gap-2 min-h-[40px] px-4 rounded-m3-full border border-outline text-on-surface m3-label-large"
          >
            <Users size={18} aria-hidden="true" />
            {t('menu.players')}
          </button>
        </div>

        {sections.map(section => (
          <section key={section.id} className="mb-8" aria-labelledby={`sec-${section.id}`}>
            <h2 id={`sec-${section.id}`} className="m3-title-medium text-on-surface-variant mb-3">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.title}
                    {...staggerChild(Math.min(staggerIndex++, 10))}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springSpatialFast}
                    onClick={item.onClick}
                    className="m3-card m3-elevated m3-interactive m3-state-layer text-left p-4 relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-m3-lg flex items-center justify-center ${TONE_CHIP[item.tone]}`}>
                        <Icon size={24} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="m3-title-medium text-on-surface flex items-center gap-2 min-w-0">
                          <span className="truncate">{item.title}</span>
                          {item.beta && (
                            <span className="shrink-0 m3-label-small px-2 py-0.5 rounded-m3-full bg-secondary-container text-on-secondary-container">
                              {t('common.beta')}
                            </span>
                          )}
                        </h3>
                        <p className="m3-body-medium text-on-surface-variant line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {showGuideModal && <UserGuideModal onClose={() => setShowGuideModal(false)} />}
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}
    </div>
  );
};

export default MainMenu;
