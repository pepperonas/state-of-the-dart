import { useTranslation } from 'react-i18next';
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, UserMinus } from 'lucide-react';
import { MatchPlayer } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import { usePlayer } from '../../context/PlayerContext';
import AnimatedNumber from '../common/AnimatedNumber';
import IconButton from '../common/IconButton';
import { springSpatialDefault } from '../../utils/motion';
import FireCanvas from './FireCanvas';

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
  removeLabel,
}) => {
  const { t } = useTranslation();
  const { players } = usePlayer();
  
  // Get full player data to access avatar
  const fullPlayer = useMemo(() => {
    return players.find(p => p.id === player.playerId);
  }, [players, player.playerId]);

  return (
    <motion.div
      // The inactive card is not faded: opacity multiplies into every text
      // colour and pushed the stat labels below AA. Surface tone and the
      // primary ring carry the distinction.
      animate={{ scale: isActive ? 1.03 : 1 }}
      transition={springSpatialDefault}
      data-testid={`player-card-${player.name}`}
      aria-current={isActive ? 'true' : undefined}
      className={`m3-card m3-elevated p-4 ${
        isActive
          ? 'sotd-on-fire bg-surface-container-high'
          : 'bg-surface-container'
      }`}
    >
      {/* The player at the oche burns (WebGL flames along the bottom edge). */}
      {isActive && <FireCanvas />}
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
              label={removeLabel ?? t('player_score.remove')}
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
        className={`block m3-display-small m3-emphasized text-center mb-3 tabular-nums ${
          remaining <= 170 ? 'text-primary' : 'text-on-surface'
        }`}
      />

      <div className={`grid ${showSets ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm`}>
        <div className="bg-surface-container-highest rounded-m3-sm p-2">
          <div className="text-on-surface-variant m3-label-medium">{t('game.average')}</div>
          <div className="font-semibold text-on-surface">{average.toFixed(2)}</div>
        </div>

        <div className="bg-surface-container-highest rounded-m3-sm p-2">
          <div className="text-on-surface-variant m3-label-medium">{t('game.legs')}</div>
          <div className="font-semibold text-on-surface flex items-center gap-1">
            {legsWon}
            <Trophy size={14} className="text-tertiary" />
          </div>
        </div>

        {showSets && (
          <div className="bg-surface-container-highest rounded-m3-sm p-2">
            <div className="text-on-surface-variant m3-label-medium">{t('game.sets')}</div>
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
            <span className="font-bold">{t('player_score.highest')}</span>
            <span className="opacity-70"> {player.matchHighestScore}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(PlayerScore);