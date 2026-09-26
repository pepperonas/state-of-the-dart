import { isBogeyNumber, validateScore } from './scoring';

export type VisitCheck =
  | { ok: true; checkout: boolean; bust: boolean }
  | { ok: false; reason: 'range' | 'impossible' | 'no_finish' };

/**
 * Checks a typed visit total before it goes to the server (which checks it
 * again — this only spares the player a round trip and gives a reason).
 *
 * - 0–180, and not one of the totals three darts cannot make (179, 178, …).
 * - Exactly the remaining score is a checkout; with double-out it is only
 *   possible from 170 down and not from a bogey number (169, 168, …).
 * - Anything that overshoots or leaves 1 is a bust — allowed, it is a real
 *   outcome, the visit scores nothing.
 */
export function checkOnlineVisit(score: number, remaining: number, doubleOut = true): VisitCheck {
  if (!Number.isInteger(score) || score < 0 || score > 180) return { ok: false, reason: 'range' };
  if (!validateScore(score)) return { ok: false, reason: 'impossible' };
  if (score === remaining) {
    if (doubleOut && (remaining > 170 || isBogeyNumber(remaining))) return { ok: false, reason: 'no_finish' };
    return { ok: true, checkout: true, bust: false };
  }
  const left = remaining - score;
  const bust = left < 0 || (doubleOut && left === 1);
  return { ok: true, checkout: false, bust };
}

const CLIENT_ID_KEY = 'sotd-online-client-id';

/**
 * A stable secret for this browser, so the server can give a reconnecting
 * player their seat back. It is sent only to the server and never shown to
 * other players: the public seat id is a hash of it (server: seatIdFromSecret).
 */
export function getOnlineClientSecret(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
    const id = `c-${crypto.randomUUID()}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return `c-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}
