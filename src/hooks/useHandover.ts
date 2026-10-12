import { useEffect, useState } from 'react';

/** How long the thrower stays the hero card after a visit (0.34.0). */
export const HOLD_MS = 450;

interface Track {
  active: number;
  visits: number;
  leg: number;
  shown: number;
  holding: boolean;
}

/**
 * The player shown as the hero card — the "relay" turn change.
 *
 * The game passes the turn in the same tick as it books a visit (so a total
 * typed right away lands with the right player). Shown at once, the visit's
 * score landed on a card that was already shrinking into a row. So the
 * DISPLAY waits: after a visit in the same leg the thrower stays the hero for
 * `HOLD_MS` — the score lands there — and then hands over.
 *
 * Only a visit holds. Undo, a new leg, resuming, a removed player change at
 * once; a second change while holding jumps straight to the newest player (no
 * queue); `enabled = false` (reduced motion) never holds. The real active
 * player keeps driving input, bots and `aria-current`.
 */
export function useHandover(active: number, visits: number, leg: number, enabled = true): number {
  const [track, setTrack] = useState<Track>({ active, visits, leg, shown: active, holding: false });

  // State adjusted during render: decide on the change before it paints.
  if (active !== track.active || visits !== track.visits || leg !== track.leg) {
    if (active === track.active) {
      setTrack({ ...track, visits, leg });
    } else {
      const byVisit = enabled && !track.holding && visits > track.visits && leg === track.leg;
      setTrack({ active, visits, leg, shown: byVisit ? track.shown : active, holding: byVisit });
    }
  }

  useEffect(() => {
    if (!track.holding) return;
    const timer = setTimeout(() => setTrack(s => ({ ...s, shown: s.active, holding: false })), HOLD_MS);
    return () => clearTimeout(timer);
  }, [track.holding, track.active]);

  return track.shown;
}
