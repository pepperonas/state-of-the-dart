import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, X } from 'lucide-react';
import { AchievementHint as AchievementHintType } from '../../hooks/useAchievementHints';

interface AchievementHintProps {
  hints: AchievementHintType[];
  onDismiss: (achievementId: string) => void;
}

const AchievementHint: React.FC<AchievementHintProps> = ({ hints, onDismiss }) => {
  if (hints.length === 0) return null;

  const hint = hints[0]; // Show first hint only
  const progressPercent = (hint.progress / hint.target) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]"
      >
        <div className="glass-card p-4 shadow-2xl border-2 border-primary-500/50 bg-gradient-to-r from-primary-900/20 to-accent-900/20 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-accent-500/10 opacity-50" />

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-primary-500/20 p-2 rounded-lg">
                  <TrendingUp size={20} className="text-primary-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Fast geschafft!</h4>
                  <p className="text-primary-400 text-xs font-medium">Achievement in Reichweite</p>
                </div>
              </div>
              <button
                onClick={() => onDismiss(hint.achievementId)}
                className="text-dark-400 hover:text-white transition-colors p-1 rounded-full hover:bg-dark-700"
                aria-label="Close hint"
              >
                <X size={18} />
              </button>
            </div>

            {/* Achievement Info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 flex-shrink-0 bg-dark-800 rounded-full flex items-center justify-center text-2xl border border-dark-700 shadow-inner">
                {hint.achievementIcon}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{hint.achievementName}</p>
                <p className="text-dark-300 text-xs">{hint.message}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-dark-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-dark-400">
                {hint.progress.toFixed(1)} / {hint.target}
              </span>
              <span className="text-xs text-primary-400 font-semibold">
                {progressPercent.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AchievementHint;
