import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { isGeneratedPlayer } from '../../utils/playerOrder';
import { FINISHED_MATCH_KEY } from '../../pwa/InstallCard';

const DISMISSED_KEY = 'sotd-onboarding-dismissed';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export interface OnboardingState {
  hasOwnPlayer: boolean;
  hasOpponent: boolean;
  hasFinishedMatch: boolean;
}

/** Pure: which first-run steps are done. */
export const onboardingState = (
  players: Array<{ name: string; isBot?: boolean }>,
  finished: boolean,
): OnboardingState => {
  const people = players.filter(p => !p.isBot && !isGeneratedPlayer(p));
  return {
    hasOwnPlayer: people.length > 0,
    hasOpponent: players.length >= 2,
    hasFinishedMatch: finished,
  };
};

/**
 * First-run checklist. A new account used to land on a grid of tiles with no
 * hint where to begin; this shows the three steps to a first game and goes
 * away once they are done (or when dismissed).
 */
const OnboardingCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players, loading } = usePlayer();
  const [dismissed, setDismissed] = useState(() => read(DISMISSED_KEY) === '1');

  if (loading || dismissed) return null;
  const state = onboardingState(players, read(FINISHED_MATCH_KEY) === '1');
  if (state.hasOwnPlayer && state.hasOpponent && state.hasFinishedMatch) return null;

  const steps = [
    { done: state.hasOwnPlayer, label: t('onboarding.step_player'), action: () => navigate('/players') },
    { done: state.hasOpponent, label: t('onboarding.step_opponent'), action: () => navigate('/game?new=1') },
    { done: state.hasFinishedMatch, label: t('onboarding.step_match'), action: () => navigate('/game?new=1') },
  ];

  return (
    <section aria-labelledby="onboarding-title" className="mb-6 p-4 rounded-m3-lg bg-tertiary-container text-on-tertiary-container relative">
      <button
        type="button"
        aria-label={t('onboarding.dismiss')}
        onClick={() => { try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* ignore */ } setDismissed(true); }}
        className="m3-state-layer absolute top-2 right-2 w-12 h-12 rounded-m3-full grid place-items-center"
      >
        <X size={20} />
      </button>
      <h2 id="onboarding-title" className="m3-title-large mb-1 pr-12">{t('onboarding.title')}</h2>
      <p className="m3-body-medium mb-3 opacity-90">{t('onboarding.body')}</p>
      <ol className="space-y-1">
        {steps.map((step, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={step.action}
              disabled={step.done}
              className="m3-state-layer w-full flex items-center gap-3 min-h-[44px] px-2 rounded-m3-md text-left disabled:opacity-70"
            >
              {step.done ? <CheckCircle2 size={22} aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}
              <span className={`m3-body-large ${step.done ? 'line-through' : ''}`}>{step.label}</span>
              <span className="sr-only">{step.done ? t('onboarding.done') : ''}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default OnboardingCard;
