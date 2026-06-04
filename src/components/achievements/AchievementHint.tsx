import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, X } from 'lucide-react';
import { IconButton } from '../common';
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
        <div className="p-4 rounded-m3-lg shadow-m3-3 border border-outline-variant bg-primary-container relative overflow-hidden">
          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-surface-container-highest p-2 rounded-m3-sm">
                  <TrendingUp size={20} className="text-primary" />
                </div>
                <div>
                  <h4 className="text-on-primary-container m3-title-small">Fast geschafft!</h4>
                  <p className="text-on-primary-container/80 m3-label-medium">Achievement in Reichweite</p>
                </div>
              </div>
              <IconButton
                onClick={() => onDismiss(hint.achievementId)}
                label="Close hint"
              >
                <X size={18} />
              </IconButton>
            </div>

            {/* Achievement Info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 flex-shrink-0 bg-surface-container-highest rounded-m3-full flex items-center justify-center text-2xl border border-outline-variant shadow-inner">
                {hint.achievementIcon}
              </div>
              <div className="flex-1">
                <p className="text-on-primary-container m3-title-small">{hint.achievementName}</p>
                <p className="text-on-primary-container/80 m3-body-small">{hint.message}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-surface-container-highest rounded-m3-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 bg-primary rounded-m3-full"
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="m3-label-medium text-on-primary-container/80">
                {hint.progress.toFixed(1)} / {hint.target}
              </span>
              <span className="m3-label-medium text-primary font-semibold">
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
