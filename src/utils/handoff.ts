/**
 * The hand-over between two players in an X01 visit.
 *
 * The turn passes the moment a visit is confirmed; a short-lived chip above
 * the input shows what was just booked, so the player who threw can see their
 * score land while the next one is already typing.
 */
export interface Handoff {
  /** Changes with every hand-over so the chip restarts its animation. */
  key: number;
  name: string;
  /** What the visit counted for (0 on a bust). */
  score: number;
  /** The thrower's score left after the visit. */
  remaining: number;
  bust: boolean;
}

/** How long the hand-over chip stays up. */
export const HANDOFF_MS = 2200;

/** How long the leg-won overlay stays up unless dismissed. */
export const LEG_WON_MS = 2500;
