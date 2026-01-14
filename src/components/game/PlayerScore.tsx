import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target } from 'lucide-react';
import { MatchPlayer } from '../../types/index';

interface PlayerScoreProps {
  player: MatchPlayer;
  remaining: number;
  isActive: boolean;
  average: number;
  legsWon: number;
  setsWon: number;
}

const PlayerScore: React.FC<PlayerScoreProps> = ({
  player,
  remaining,
  isActive,
  average,
  legsWon,
  setsWon,
}) => {
  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        opacity: isActive ? 1 : 0.75,
      }}
      transition={{ duration: 0.3 }}
      className={`glass-card rounded-xl shadow-lg p-4 transition-all ${
        isActive
          ? 'ring-4 ring-green-500'
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">
          {player.name}
        </h3>
        {isActive && (
          <Target className="text-green-500 animate-pulse" size={24} />
        )}
      </div>
      
      <motion.div
        key={remaining}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`text-4xl font-bold text-center mb-3 ${
          remaining <= 170 ? 'text-green-400 neon-green' : 'text-white'
        }`}
      >
        {remaining}
      </motion.div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="text-gray-400 text-xs">Average</div>
          <div className="font-semibold text-white">{average.toFixed(2)}</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="text-gray-400 text-xs">Legs</div>
          <div className="font-semibold text-white flex items-center gap-1">
            {legsWon}
            <Trophy size={14} className="text-yellow-500" />
          </div>
        </div>
      </div>
      
      {player.match180s > 0 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-2xl font-bold text-red-500">180</span>
          <span className="text-sm text-gray-400">
            ×{player.match180s}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default PlayerScore;