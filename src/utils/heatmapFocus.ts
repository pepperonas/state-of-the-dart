/**
 * Which player the live heatmap shows (0.42.0).
 *
 * It follows the player at the oche. A tap on another player's chip shows that
 * player — until the turn passes: then the heatmap is back on whoever throws
 * now. Before, it was stuck on the first player of the match.
 *
 * `turnId` changes whenever a visit is booked or taken back (the number of
 * visits in the match), so a pick lives exactly as long as the turn it was
 * made in.
 */
export interface HeatmapPick {
  playerId: string;
  turnId: number;
}

export const heatmapPlayer = (pick: HeatmapPick | null, turnId: number, activeId: string | undefined): string | undefined =>
  pick && pick.turnId === turnId ? pick.playerId : activeId;
