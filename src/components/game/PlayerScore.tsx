import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, UserMinus } from 'lucide-react';
import { MatchPlayer } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import { usePlayer } from '../../context/PlayerContext';
import AnimatedNumber from '../common/AnimatedNumber';
import IconButton from '../common/IconButton';
import { springSpatialDefault } from '../../utils/motion';

interface PlayerScoreProps {
  player: MatchPlayer;
  remaining: number;
  isActive: boolean;
  average: number;
  legsWon: number;
  setsWon: number;
  showSets?: boolean;
  /** Remove this player from the running match. Omit to hide the control.
   *  Takes the id so callers can pass one stable callback for every card. */
  onRemove?: (playerId: string) => void;
  /** Tooltip for the remove control. */
  removeLabel?: string;
}

const PlayerScore: React.FC<PlayerScoreProps> = ({
  player,
  remaining,
  isActive,
  average,
  legsWon,
  setsWon,
  showSets = false,
  onRemove,
  removeLabel = 'Spieler entfernen',
}) => {
  const { players } = usePlayer();
  
  // Get full player data to access avatar
  const fullPlayer = useMemo(() => {
    return players.find(p => p.id === player.playerId);
  }, [players, player.playerId]);

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        opacity: isActive ? 1 : 0.75,
      }}
      transition={springSpatialDefault}
      className={`m3-card m3-elevated p-4 ${
        isActive
          ? 'ring-4 ring-[var(--m3-primary)] bg-surface-container-high'
          : 'bg-surface-container'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <PlayerAvatar avatar={fullPlayer?.avatar} name={player.name} size="md" />
          <h3 className="m3-title-large text-on-surface truncate">
            {player.name}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isActive && (
            <Target className="text-primary animate-pulse" size={24} />
          )}
          {onRemove && (
            <IconButton
              label={removeLabel}
              onClick={() => onRemove(player.playerId)}
              className="text-on-surface-variant"
            >
              <UserMinus size={18} />
            </IconButton>
          )}
        </div>
      </div>

      <AnimatedNumber
        value={remaining}
        className={`block text-4xl font-bold text-center mb-3 ${
          remaining <= 170 ? 'text-primary' : 'text-on-surface'
        }`}
      />

      <div className={`grid ${showSets ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm`}>
        <div className="bg-surface-container-highest rounded-m3-sm p-2">
          <div className="text-on-surface-variant text-xs">Average</div>
          <div className="font-semibold text-on-surface">{average.toFixed(2)}</div>
        </div>

        <div className="bg-surface-container-highest rounded-m3-sm p-2">
          <div className="text-on-surface-variant text-xs">Legs</div>
          <div className="font-semibold text-on-surface flex items-center gap-1">
            {legsWon}
            <Trophy size={14} className="text-tertiary" />
          </div>
        </div>

        {showSets && (
          <div className="bg-surface-container-highest rounded-m3-sm p-2">
            <div className="text-on-surface-variant text-xs">Sets</div>
            <div className="font-semibold text-on-surface flex items-center gap-1">
              {setsWon}
              <Trophy size={14} className="text-primary" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {player.match180s > 0 && (
          <div className="bg-error-container text-on-error-container rounded-m3-sm p-1 text-center">
            <span className="font-bold">180</span>
            <span className="opacity-70"> ×{player.match180s}</span>
          </div>
        )}
        {player.match140Plus > 0 && (
          <div className="bg-tertiary-container text-on-tertiary-container rounded-m3-sm p-1 text-center">
            <span className="font-bold">140+</span>
            <span className="opacity-70"> ×{player.match140Plus}</span>
          </div>
        )}
        {player.match100Plus > 0 && (
          <div className="bg-secondary-container text-on-secondary-container rounded-m3-sm p-1 text-center">
            <span className="font-bold">100+</span>
            <span className="opacity-70"> ×{player.match100Plus}</span>
          </div>
        )}
        {player.matchHighestScore > 0 && (
          <div className="bg-primary-container text-on-primary-container rounded-m3-sm p-1 text-center">
            <span className="font-bold">High</span>
            <span className="opacity-70"> {player.matchHighestScore}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(PlayerScore);