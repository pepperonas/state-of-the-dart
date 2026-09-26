import { isGeneratedPlayer } from '../../utils/playerOrder';

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
