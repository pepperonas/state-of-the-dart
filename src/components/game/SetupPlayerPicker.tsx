import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import { useOptionalAuth } from '../../context/authContextValue';
import { limitsOf, announcePlanLimit } from '../../utils/plan';
import PremiumLock from '../plan/PremiumLock';

interface SetupPlayerPickerProps {
  players: Player[];
  selected: Player[];
  onChange: (next: Player[]) => void;
  /** Most players the mode takes. */
  max?: number;
}

/**
 * The player pick of the Cricket, Around the Clock and Shanghai setups (0.43.0).
 *
 * Each setup had its own copy, and they had drifted: three corner radii, a
 * primary-container fill in one and a ring in the others, two heading levels.
 * One tile now: selected = primary ring on a raised surface (the app's rule for
 * a chosen item), the pressed state is announced.
 */
const SetupPlayerPicker: React.FC<SetupPlayerPickerProps> = ({ players, selected, onChange, max = 4 }) => {
  const { t } = useTranslation();
  // Free tier (0.49.0): two per game here too. These modes are not stored on
  // the server, so the app is the only place to hold the line.
  const plan = useOptionalAuth()?.plan ?? 'premium';
  const planMax = limitsOf(plan).matchPlayers;
  const limit = Math.min(max, planMax);
  return (
    <section className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="m3-title-medium text-on-surface">{t('game.select_players')}</h2>
        {plan !== 'premium' && (
          <span data-testid="free-player-limit" className="flex items-center gap-2 m3-body-small text-on-surface-variant">
            {t('plan.free_match_hint', { count: planMax })}
            <PremiumLock />
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="setup-players">
        {players.filter(p => !p.isBot).map(player => {
          const isOn = selected.some(p => p.id === player.id);
          return (
            <button
              key={player.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => {
                if (isOn) onChange(selected.filter(p => p.id !== player.id));
                else if (selected.length < limit) onChange([...selected, player]);
                else if (plan !== 'premium' && limit === planMax) announcePlanLimit({ feature: 'match_players', limit: planMax });
              }}
              className={`m3-state-layer p-3 rounded-m3-lg transition ${
                isOn
                  ? 'bg-surface-container-high ring-2 ring-[var(--m3-primary)]'
                  : 'bg-surface-container border border-outline-variant'
              }`}
            >
              <span className="flex justify-center mb-1">
                <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
              </span>
              <span className="block m3-label-large text-on-surface text-center truncate">{player.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SetupPlayerPicker;
