import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../common';
import { celebrate as confetti } from '../../utils/celebration';
import { useAchievements } from '../../context/AchievementContext';
import { usePlayer } from '../../context/PlayerContext';
import { AchievementTier, AchievementNotification as AchievementNotificationType, getTierColor, getRarityColor, getAchievementScope, getScopeColor, ACHIEVEMENTS } from '../../types/achievements';
import { audioSystem } from '../../utils/audio';
import { Icon, iconForEmoji } from '../icons';
import { achievementName, achievementDescription } from '../../utils/achievementText';

const TIER_CONFETTI_COUNT: Record<AchievementTier, number> = {
  bronze: 30,
  silver: 50,
  gold: 80,
  platinum: 120,
  diamond: 200,
};

/** i18n keys of the tier names (rendered upper-case). */
const TIER_LABEL_KEYS: Record<AchievementTier, string> = {
  bronze: 'achievement_toast.tier_bronze',
  silver: 'achievement_toast.tier_silver',
  gold: 'achievement_toast.tier_gold',
  platinum: 'achievement_toast.tier_platinum',
  diamond: 'achievement_toast.tier_diamond',
};

function getTierColors(tier: AchievementTier): string[] {
  switch (tier) {
    case 'bronze': return ['#CD7F32', '#B87333', '#8B6914'];
    case 'silver': return ['#C0C0C0', '#D4D4D4', '#A8A8A8'];
    case 'gold': return ['#FFD700', '#FFC107', '#FFB300'];
    case 'platinum': return ['#E5E4E2', '#C0C0C0', '#BCC6CC', '#A0D2FF'];
    case 'diamond': return ['#B9F2FF', '#E0F7FF', '#FFFFFF', '#87CEEB', '#FFD700'];
  }
}

function getTierGlow(tier: AchievementTier): string {
  const color = getTierColor(tier);
  return `0 0 20px ${color}80, 0 0 40px ${color}40, 0 0 60px ${color}20`;
}

function getTierGlowIntense(tier: AchievementTier): string {
  const color = getTierColor(tier);
  return `0 0 30px ${color}A0, 0 0 60px ${color}60, 0 0 90px ${color}30`;
}

// Individual notification card
const NotificationCard: React.FC<{
  notification: AchievementNotificationType;
  onDismiss: () => void;
  index: number;
}> = ({ notification, onDismiss, index }) => {
  const { t } = useTranslation();
  const { getPlayer } = usePlayer();
  const confettiFiredRef = useRef(false);

  const { achievement, playerId, unlockedCount } = notification;
  const tier = achievement.tier;
  const tierColor = getTierColor(tier);
  const totalAchievements = ACHIEVEMENTS.length;
  const player = getPlayer(playerId);
  const playerName = player?.name || t('achievements.player');

  const fireConfetti = useCallback((tierArg: AchievementTier) => {
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    const count = TIER_CONFETTI_COUNT[tierArg];
    const colors = getTierColors(tierArg);
    const spread = tierArg === 'diamond' ? 160 : tierArg === 'platinum' ? 140 : 120;

    confetti({
      particleCount: Math.floor(count * 0.6),
      spread,
      origin: { y: 0.3, x: 0.5 },
      colors,
      ticks: 200,
      gravity: 0.8,
      scalar: 1.2,
      shapes: ['circle', 'square'],
      disableForReducedMotion: true,
    });

    if (tierArg === 'gold' || tierArg === 'platinum' || tierArg === 'diamond') {
      setTimeout(() => {
        confetti({
          particleCount: Math.floor(count * 0.2),
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.4 },
          colors,
          ticks: 150,
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: Math.floor(count * 0.2),
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.4 },
          colors,
          ticks: 150,
          disableForReducedMotion: true,
        });
      }, 200);
    }

    if (tierArg === 'diamond') {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          confetti({
            particleCount: 30,
            spread: 180,
            origin: { y: 0, x: Math.random() },
            colors: ['#FFFFFF', '#B9F2FF', '#FFD700'],
            ticks: 300,
            gravity: 0.4,
            scalar: 0.8,
            shapes: ['circle'],
            disableForReducedMotion: true,
          });
        }, 400 + i * 300);
      }
    }
  }, []);

  useEffect(() => {
    // Only fire confetti and sound for the first card
    if (index === 0) {
      fireConfetti(tier);
      audioSystem.playAchievementSound(tier);
    }
  }, [tier, index, fireConfetti]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <motion.div
        className="relative overflow-hidden rounded-m3-lg bg-surface-container-high shadow-m3-3 border border-outline-variant"
        animate={{
          boxShadow: [getTierGlow(tier), getTierGlowIntense(tier), getTierGlow(tier)],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Animated gradient border */}
        <motion.div
          className="absolute inset-0 rounded-m3-lg pointer-events-none"
          style={{
            border: `2px solid ${tierColor}`,
            opacity: 0.6,
          }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Background shimmer */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, ${tierColor}40, transparent 60%),
                         radial-gradient(ellipse at 70% 80%, ${tierColor}20, transparent 50%)`,
          }}
        />

        <div className="relative z-10 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <motion.span
              className="text-xs font-bold tracking-[0.2em] uppercase"
              style={{ color: tierColor }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {t('achievement_toast.unlocked_by', { name: playerName })}
            </motion.span>
            <IconButton
              onClick={onDismiss}
              label={t('common.close')}
              className="ml-2 flex-shrink-0"
            >
              <X size={18} />
            </IconButton>
          </div>

          {/* Icon + Achievement Info */}
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}10)`,
                border: `1px solid ${tierColor}40`,
              }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon name={iconForEmoji(achievement.icon)} size={28} />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-on-surface m3-title-small truncate">{achievementName(achievement, t)}</h4>
                <span
                  className="flex items-center gap-0.5 text-sm font-bold flex-shrink-0"
                  style={{ color: tierColor }}
                >
                  +{achievement.points} <Star size={12} fill={tierColor} />
                </span>
              </div>
              <p className="text-on-surface-variant m3-body-small line-clamp-2">{achievementDescription(achievement, t)}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className="px-2 py-0.5 rounded-md text-xs font-bold tracking-wider"
              style={{
                backgroundColor: tierColor + '25',
                color: tierColor,
                border: `1px solid ${tierColor}30`,
              }}
            >
              {t(TIER_LABEL_KEYS[tier]).toUpperCase()}
            </span>
            {achievement.rarity && (
              <span
                className="px-2 py-0.5 rounded-md text-xs font-bold tracking-wider"
                style={{
                  backgroundColor: getRarityColor(achievement.rarity) + '25',
                  color: getRarityColor(achievement.rarity),
                  border: `1px solid ${getRarityColor(achievement.rarity)}30`,
                }}
              >
                {t(`achievements.${achievement.rarity}`).toUpperCase()}
              </span>
            )}
            {(() => {
              const scope = getAchievementScope(achievement);
              const sc = getScopeColor(scope);
              return (
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-bold tracking-wider"
                  style={{
                    backgroundColor: sc + '25',
                    color: sc,
                    border: `1px solid ${sc}30`,
                  }}
                >
                  {t(`achievements.scope_${scope}`).toUpperCase()}
                </span>
              );
            })()}
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-surface-container-highest text-on-surface-variant flex items-center gap-1 border border-outline-variant">
              <Star size={10} />
              {t('achievement_toast.points_short', { count: achievement.points })}
            </span>
          </div>

          {/* Achievement progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="m3-label-medium text-on-surface-variant">{t('achievements.progress')}</span>
              <span className="m3-label-medium text-on-surface-variant">
                {t('achievement_toast.unlocked_count', { count: unlockedCount, total: totalAchievements })}
              </span>
            </div>
            <div className="h-1.5 bg-surface-container-highest rounded-m3-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: tierColor }}
                initial={{ width: `${((unlockedCount - 1) / totalAchievements) * 100}%` }}
                animate={{ width: `${(unlockedCount / totalAchievements) * 100}%` }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main component: shows all active notifications stacked
const AchievementNotification: React.FC = () => {
  const { t } = useTranslation();
  const { currentNotification, notificationQueue, dismissNotification, dismissAllNotifications } = useAchievements();
  const [showFlash, setShowFlash] = useState(false);
  const lastNotificationRef = useRef<string | null>(null);

  // Collect all active notifications
  const allNotifications: AchievementNotificationType[] = [];
  if (currentNotification) allNotifications.push(currentNotification);
  allNotifications.push(...notificationQueue);

  // Flash effect when new notification arrives
  useEffect(() => {
    if (currentNotification) {
      const key = `${currentNotification.achievement.id}-${currentNotification.playerId}`;
      if (key !== lastNotificationRef.current) {
        lastNotificationRef.current = key;
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 300);
      }
    }
  }, [currentNotification]);

  if (allNotifications.length === 0) return null;

  const firstTierColor = getTierColor(allNotifications[0].achievement.tier);

  return (
    <>
      {/* Impact Flash Overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="fixed inset-0 z-[9998] pointer-events-none"
            style={{ backgroundColor: firstTierColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Stacked notification cards */}
      <div className="fixed top-4 left-1/2 z-[9999] w-full max-w-md px-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto" style={{ transform: 'translateX(-50%)' }}>
        {allNotifications.length > 1 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={dismissAllNotifications}
            className="self-end px-3 py-1.5 rounded-m3-full text-xs font-bold tracking-wide text-on-surface-variant hover:text-on-surface bg-surface-container-high hover:bg-surface-container-highest backdrop-blur-sm border border-outline-variant transition-all"
          >
            {t('achievement_toast.close_all', { count: allNotifications.length })}
          </motion.button>
        )}
        <AnimatePresence mode="popLayout">
          {allNotifications.map((notification, index) => (
            <NotificationCard
              key={`${notification.achievement.id}-${notification.playerId}-${index}`}
              notification={notification}
              index={index}
              onDismiss={() => dismissNotification(index)}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AchievementNotification;
