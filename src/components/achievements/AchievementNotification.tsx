import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Star } from 'lucide-react';
import { useAchievements } from '../../context/AchievementContext';
import { getTierColor, getRarityColor } from '../../types/achievements';

const AchievementNotification: React.FC = () => {
  const { notification, clearNotification } = useAchievements();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(clearNotification, 300); // Wait for exit animation
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(false);
    }
  }, [notification, clearNotification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(clearNotification, 300);
  };

  if (!notification) return null;

  const { achievement } = notification;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-md px-4"
        >
          <div className="glass-card p-4 shadow-2xl border-2 border-primary-500 relative overflow-hidden">
            {/* Background Glow Effect */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${getTierColor(achievement.tier)}, transparent 70%)`,
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary-500/20 p-2 rounded-lg">
                    <Trophy size={24} className="text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Achievement Freigeschaltet!</h3>
                    <p className="text-primary-400 text-xs font-medium">
                      +{achievement.points} Punkte
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-dark-400 hover:text-white transition-colors p-1"
                  aria-label="Close notification"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Achievement Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-5xl">{achievement.icon}</div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-xl mb-1">{achievement.name}</h4>
                  <p className="text-dark-300 text-sm">{achievement.description}</p>
                </div>
              </div>

              {/* Achievement Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2 py-1 rounded text-xs font-bold"
                  style={{
                    backgroundColor: getTierColor(achievement.tier) + '33',
                    color: getTierColor(achievement.tier),
                  }}
                >
                  {achievement.tier.toUpperCase()}
                </span>
                {achievement.rarity && (
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{
                      backgroundColor: getRarityColor(achievement.rarity) + '33',
                      color: getRarityColor(achievement.rarity),
                    }}
                  >
                    {achievement.rarity.toUpperCase()}
                  </span>
                )}
                <span className="px-2 py-1 rounded text-xs font-bold bg-accent-500/20 text-accent-400 flex items-center gap-1">
                  <Star size={12} />
                  {achievement.points}
                </span>
              </div>
            </div>

            {/* Animated Border Glow */}
            <motion.div
              className="absolute inset-0 border-2 rounded-xl pointer-events-none"
              style={{ borderColor: getTierColor(achievement.tier) }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Confetti/Sparkle Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(10)].map((_, i) => {
              // Pre-calculate random values to avoid calling Math.random during render
              const randomX = 50 + (i * 37 % 100 - 50);
              const randomY = 50 + (i * 73 % 100 - 50);
              const randomRotate = (i * 97) % 360;
              const randomDuration = 1 + (i % 5) * 0.1;
              const randomDelay = (i % 5) * 0.05;

              return (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  initial={{
                    x: '50%',
                    y: '50%',
                    opacity: 1,
                    scale: 0,
                  }}
                  animate={{
                    x: `${randomX}%`,
                    y: `${randomY}%`,
                    opacity: 0,
                    scale: 1,
                    rotate: randomRotate,
                  }}
                  transition={{
                    duration: randomDuration,
                    delay: randomDelay,
                    ease: 'easeOut',
                  }}
                >
                  ✨
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementNotification;
