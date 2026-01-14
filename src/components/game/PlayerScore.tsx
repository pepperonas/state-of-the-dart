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
          remaining <= 170 ? 'text-success-400 neon-success' : 'text-white'
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
      
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {player.match180s > 0 && (
          <div className="bg-red-500/20 rounded p-1 text-center">
            <span className="font-bold text-red-400">180</span>
            <span className="text-gray-400"> ×{player.match180s}</span>
          </div>
        )}
        {player.match140Plus > 0 && (
          <div className="bg-orange-500/20 rounded p-1 text-center">
            <span className="font-bold text-orange-400">140+</span>
            <span className="text-gray-400"> ×{player.match140Plus}</span>
          </div>
        )}
        {player.match100Plus > 0 && (
          <div className="bg-yellow-500/20 rounded p-1 text-center">
            <span className="font-bold text-yellow-400">100+</span>
            <span className="text-gray-400"> ×{player.match100Plus}</span>
          </div>
        )}
        {player.matchHighestScore > 0 && (
          <div className="bg-blue-500/20 rounded p-1 text-center">
            <span className="font-bold text-blue-400">High</span>
            <span className="text-gray-400"> {player.matchHighestScore}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PlayerScore;