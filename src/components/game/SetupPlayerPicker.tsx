import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';

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
  return (
    <section className="mb-6">
      <h2 className="m3-title-medium text-on-surface mb-3">{t('game.select_players')}</h2>
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
                else if (selected.length < max) onChange([...selected, player]);
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
