import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAchievements } from '../../context/AchievementContext';
import { usePlayer } from '../../context/PlayerContext';
import { AchievementTier, AchievementNotification as AchievementNotificationType, getTierColor, getRarityColor } from '../../types/achievements';
import { audioSystem } from '../../utils/audio';

const TIER_CONFETTI_COUNT: Record<AchievementTier, number> = {
  bronze: 30,
  silver: 50,
  gold: 80,
  platinum: 120,
  diamond: 200,
};

const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'BRONZE',
  silver: 'SILBER',
  gold: 'GOLD',
  platinum: 'PLATIN',
  diamond: 'DIAMANT',
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
  const { getPlayer } = usePlayer();
  const confettiFiredRef = useRef(false);

  const { achievement, playerId, unlockedCount } = notification;
  const tier = achievement.tier;
  const tierColor = getTierColor(tier);
  const totalAchievements = 247;
  const player = getPlayer(playerId);
  const playerName = player?.name || 'Spieler';

  const fireConfetti = useCallback((t: AchievementTier) => {
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    const count = TIER_CONFETTI_COUNT[t];
    const colors = getTierColors(t);
    const spread = t === 'diamond' ? 160 : t === 'platinum' ? 140 : 120;

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

    if (t === 'gold' || t === 'platinum' || t === 'diamond') {
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

    if (t === 'diamond') {
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
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 20, 35, 0.95), rgba(10, 10, 25, 0.98))',
          backdropFilter: 'blur(20px)',
        }}
        animate={{
          boxShadow: [getTierGlow(tier), getTierGlowIntense(tier), getTierGlow(tier)],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Animated gradient border */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
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
              {playerName} — Achievement Freigeschaltet
            </motion.span>
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 ml-2 flex-shrink-0"
              aria-label="Schliessen"
            >
              <X size={18} />
            </button>
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
              {achievement.icon}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-white font-bold text-base truncate">{achievement.name}</h4>
                <span
                  className="flex items-center gap-0.5 text-sm font-bold flex-shrink-0"
                  style={{ color: tierColor }}
                >
                  +{achievement.points} <Star size={12} fill={tierColor} />
                </span>
              </div>
              <p className="text-gray-400 text-sm line-clamp-1">{achievement.description}</p>
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
              {TIER_LABELS[tier]}
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
                {achievement.rarity.toUpperCase()}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white/5 text-gray-400 flex items-center gap-1 border border-white/10">
              <Star size={10} />
              {achievement.points} Pkt.
            </span>
          </div>

          {/* Achievement progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Fortschritt</span>
              <span className="text-xs text-gray-400 font-medium">
                {unlockedCount}/{totalAchievements} Achievements
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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
  const { currentNotification, notificationQueue, dismissNotification } = useAchievements();
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
