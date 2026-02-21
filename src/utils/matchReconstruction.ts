import { Match, GameType } from '../types/index';
import { reviveMatchDates } from '../context/GameContext';

/**
 * Reconstruct a Match object from the detail API response so it can
 * be fed into the GameContext via LOAD_MATCH.
 *
 * The API detail response already contains legs/throws but is missing
 * some fields the frontend Match type needs (currentLegIndex,
 * currentSetIndex, legStartPlayerIndex).
 */
export function reconstructMatch(apiMatch: any): Match {
  const legs = apiMatch.legs ?? [];

  // currentLegIndex = last leg without a winner (or last leg if all have winners)
  let currentLegIndex = legs.length - 1;
  for (let i = 0; i < legs.length; i++) {
    if (!legs[i].winner) {
      currentLegIndex = i;
      break;
    }
  }

  // legStartPlayerIndex: the first throw of the first leg tells us who
  // started. Then each subsequent leg alternates.
  let firstStarterId: string | null = null;
  const playerIds = (apiMatch.players ?? []).map((p: any) => p.playerId);

  if (legs.length > 0 && legs[0].throws?.length > 0) {
    firstStarterId = legs[0].throws[0].playerId;
  }

  const firstStarterIndex = firstStarterId
    ? Math.max(0, playerIds.indexOf(firstStarterId))
    : 0;

  // The starting player alternates each leg
  const legStartPlayerIndex =
    (firstStarterIndex + currentLegIndex) % Math.max(1, playerIds.length);

  const reconstructed = {
    ...apiMatch,
    type: apiMatch.type as GameType,
    currentLegIndex,
    currentSetIndex: 0,
    legStartPlayerIndex,
  };

  return reviveMatchDates(reconstructed);
}
