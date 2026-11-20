import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

/** What premium adds over free — one list for the account page, the gate and pricing. */
export const PREMIUM_PERKS = ['match_players', 'players', 'bots', 'online', 'tournaments', 'training', 'heatmap', 'history', 'export', 'scoreboard'] as const;
export const FREE_PERKS = ['modes', 'players', 'bots', 'training', 'stats', 'achievements'] as const;

const PremiumPerks: React.FC<{ kind?: 'premium' | 'free'; className?: string }> = ({ kind = 'premium', className = '' }) => {
  const { t } = useTranslation();
  const keys = kind === 'premium' ? PREMIUM_PERKS : FREE_PERKS;
  return (
    <ul className={`grid gap-2 ${className}`} data-testid={`${kind}-perks`}>
      {keys.map(k => (
        <li key={k} className="flex items-start gap-2 m3-body-medium text-on-surface">
          <Check size={18} aria-hidden="true" className={`shrink-0 mt-0.5 ${kind === 'premium' ? 'text-tertiary' : 'text-primary'}`} />
          {t(`plan.${kind}_${k}`)}
        </li>
      ))}
    </ul>
  );
};

export default PremiumPerks;
