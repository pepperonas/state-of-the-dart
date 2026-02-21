import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAchievements } from '../../context/AchievementContext';
import { AchievementTier, getTierColor, getRarityColor } from '../../types/achievements';
import { audioSystem } from '../../utils/audio';

const TIER_DURATIONS: Record<AchievementTier, number> = {
  bronze: 5000,
  silver: 6000,
  gold: 7000,
  platinum: 8000,
  diamond: 10000,
};

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

const AchievementNotification: React.FC = () => {
  const { currentNotification, dismissNotification } = useAchievements();
  const [isVisible, setIsVisible] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confettiFiredRef = useRef(false);

  const fireConfetti = useCallback((tier: AchievementTier) => {
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    const count = TIER_CONFETTI_COUNT[tier];
    const colors = getTierColors(tier);
    const spread = tier === 'diamond' ? 160 : tier === 'platinum' ? 140 : 120;

    // Main burst
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

    // Side bursts for higher tiers
    if (tier === 'gold' || tier === 'platinum' || tier === 'diamond') {
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

    // Diamond shimmer rain
    if (tier === 'diamond') {
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
    if (currentNotification) {
      const tier = currentNotification.achievement.tier;
      const duration = TIER_DURATIONS[tier];
      confettiFiredRef.current = false;

      // Phase 1: Flash
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);

      // Phase 2: Show card
      setTimeout(() => {
        setIsVisible(true);
        setProgress(100);

        // Fire confetti
        fireConfetti(tier);

        // Play sound
        audioSystem.playAchievementSound(tier);

        // Start progress countdown
        const updateInterval = 50;
        const steps = duration / updateInterval;
        let currentStep = 0;
        progressRef.current = setInterval(() => {
          currentStep++;
          setProgress(Math.max(0, 100 - (currentStep / steps) * 100));
          if (currentStep >= steps) {
            if (progressRef.current) clearInterval(progressRef.current);
          }
        }, updateInterval);

        // Auto-dismiss
        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, duration);
      }, 150);
    } else {
      setIsVisible(false);
      setShowFlash(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentNotification, fireConfetti]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    // Wait for exit animation before advancing queue
    setTimeout(() => {
      dismissNotification();
    }, 400);
  }, [dismissNotification]);

  if (!currentNotification) return null;

  const { achievement, unlockedCount } = currentNotification;
  const tier = achievement.tier;
  const tierColor = getTierColor(tier);
  const totalAchievements = 247; // Updated count after removing 3 unreachable achievements

  return (
    <>
      {/* Impact Flash Overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="fixed inset-0 z-[9998] pointer-events-none"
            style={{ backgroundColor: tierColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Achievement Card */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed top-4 left-1/2 z-[9999] w-full max-w-md px-4"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                }}
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

              <div className="relative z-10 p-5">
                {/* Header: "ACHIEVEMENT UNLOCKED" */}
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <motion.span
                      className="text-xs font-bold tracking-[0.3em] uppercase"
                      style={{ color: tierColor }}
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Achievement Freigeschaltet
                    </motion.span>
                  </motion.div>
                  <button
                    onClick={handleDismiss}
                    className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    aria-label="Schliessen"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Icon + Achievement Info */}
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    className="relative flex-shrink-0"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 15,
                      delay: 0.4,
                    }}
                  >
                    <motion.div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl"
                      style={{
                        background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}10)`,
                        border: `1px solid ${tierColor}40`,
                      }}
                      animate={{
                        scale: [1, 1.08, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {achievement.icon}
                    </motion.div>
                  </motion.div>

                  <motion.div
                    className="flex-1 min-w-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-bold text-lg truncate">{achievement.name}</h4>
                      <span
                        className="flex items-center gap-0.5 text-sm font-bold flex-shrink-0"
                        style={{ color: tierColor }}
                      >
                        +{achievement.points} <Star size={12} fill={tierColor} />
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{achievement.description}</p>
                  </motion.div>
                </div>

                {/* Badges */}
                <motion.div
                  className="flex items-center gap-2 flex-wrap mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                >
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wider"
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
                      className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wider"
                      style={{
                        backgroundColor: getRarityColor(achievement.rarity) + '25',
                        color: getRarityColor(achievement.rarity),
                        border: `1px solid ${getRarityColor(achievement.rarity)}30`,
                      }}
                    >
                      {achievement.rarity.toUpperCase()}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-white/5 text-gray-400 flex items-center gap-1 border border-white/10">
                    <Star size={10} />
                    {achievement.points} Pkt.
                  </span>
                </motion.div>

                {/* Achievement progress bar */}
                <motion.div
                  className="mb-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.3 }}
                >
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
                      transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>

                {/* Countdown progress bar */}
                <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: tierColor,
                      width: `${progress}%`,
                      opacity: 0.5,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AchievementNotification;
