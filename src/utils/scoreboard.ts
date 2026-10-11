/**
 * TV / second-screen scoreboard: the game screen publishes a small, display-
 * only snapshot of the match; `/scoreboard` renders it. Same device, same
 * browser — a BroadcastChannel carries every change at once, and a copy in
 * localStorage lets a freshly opened window show the match immediately (and
 * covers browsers without BroadcastChannel through the `storage` event).
 *
 * The scoreboard never touches GameContext: it only reads this snapshot, so a
 * second window can never write a stale match back.
 */

export const SCOREBOARD_KEY = 'state-of-the-dart-scoreboard';
export const SCOREBOARD_CHANNEL = 'sotd-scoreboard';

export interface ScoreboardVisit { score: number; bust: boolean }

export interface ScoreboardPlayer {
  id: string;
  name: string;
  avatar?: string;
  remaining: number;
  /** Place in the current leg; null while everyone is level. */
  rank: number | null;
  average: number;
  legsWon: number;
  setsWon: number;
  dartsInLeg: number;
  /** Last visits in the leg, oldest first. */
  visits: ScoreboardVisit[];
}

export interface ScoreboardSnapshot {
  v: 1;
  matchId: string;
  /** Publisher clock (ms); a snapshot older than the one shown is dropped. */
  updatedAt: number;
  startScore: number;
  status: 'in-progress' | 'paused' | 'completed';
  players: ScoreboardPlayer[];
  activeIndex: number;
  legsToWin: number;
  showSets: boolean;
  setsToWin: number;
  /** Rule tags such as "DO" or "DI TO" (empty for straight in/out). */
  rules: string;
  checkoutRoute: string[] | null;
  /** The visit being entered right now. */
  throwTotal: number;
  throwDarts: number;
  winnerName: string | null;
}

export type ScoreboardMoment =
  | { kind: 'visit' | 'ton' | '180' | 'bust'; name: string; score: number }
  | { kind: 'leg' | 'match'; name: string; score: number };

const isSnapshot = (x: unknown): x is ScoreboardSnapshot => {
  const s = x as ScoreboardSnapshot;
  return !!s && s.v === 1 && typeof s.matchId === 'string' && Array.isArray(s.players)
    && typeof s.activeIndex === 'number' && typeof s.updatedAt === 'number';
};

/** Parses a stored or received snapshot; anything malformed is null. */
export const parseSnapshot = (raw: unknown): ScoreboardSnapshot | null => {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return isSnapshot(value) ? value : null;
  } catch {
    return null;
  }
};

/** Whether `next` should replace `shown` (newer, or another match). */
export const isNewer = (shown: ScoreboardSnapshot | null, next: ScoreboardSnapshot): boolean =>
  !shown || shown.matchId !== next.matchId || next.updatedAt > shown.updatedAt;

const legsTotal = (p: ScoreboardPlayer) => p.legsWon + p.setsWon * 1000;

/**
 * What just happened between two snapshots, for the big-screen moment. Only
 * forward steps count: an undo (fewer darts) or another match shows nothing.
 */
export const momentBetween = (
  prev: ScoreboardSnapshot | null,
  next: ScoreboardSnapshot,
): ScoreboardMoment | null => {
  if (!prev || prev.matchId !== next.matchId) return null;
  if (next.status === 'completed' && prev.status !== 'completed') {
    return { kind: 'match', name: next.winnerName ?? '', score: 0 };
  }
  for (const p of next.players) {
    const before = prev.players.find(x => x.id === p.id);
    if (before && legsTotal(p) > legsTotal(before)) {
      return { kind: 'leg', name: p.name, score: 0 };
    }
  }
  for (const p of next.players) {
    const before = prev.players.find(x => x.id === p.id);
    if (!before || p.dartsInLeg <= before.dartsInLeg) continue;
    const last = p.visits[p.visits.length - 1];
    if (!last) continue;
    if (last.bust) return { kind: 'bust', name: p.name, score: last.score };
    if (last.score === 180) return { kind: '180', name: p.name, score: 180 };
    if (last.score >= 100) return { kind: 'ton', name: p.name, score: last.score };
    return { kind: 'visit', name: p.name, score: last.score };
  }
  return null;
};

let channel: BroadcastChannel | null = null;
const getChannel = (): BroadcastChannel | null => {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(SCOREBOARD_CHANNEL);
  return channel;
};

/** Publishes a snapshot to every open scoreboard on this device. */
export const publishScoreboard = (snapshot: ScoreboardSnapshot): void => {
  try {
    localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(snapshot));
  } catch { /* storage full or blocked: the channel still carries it */ }
  try {
    getChannel()?.postMessage(snapshot);
  } catch { /* a closed channel only costs the live update */ }
};

/** The last published snapshot, for a window that opens mid-match. */
export const readScoreboard = (): ScoreboardSnapshot | null => {
  try {
    return parseSnapshot(localStorage.getItem(SCOREBOARD_KEY));
  } catch {
    return null;
  }
};

/** Listens for snapshots; returns the unsubscribe function. */
export const subscribeScoreboard = (onSnapshot: (s: ScoreboardSnapshot) => void): (() => void) => {
  const fromChannel = (e: MessageEvent) => {
    const s = parseSnapshot(e.data);
    if (s) onSnapshot(s);
  };
  const fromStorage = (e: StorageEvent) => {
    if (e.key !== SCOREBOARD_KEY || !e.newValue) return;
    const s = parseSnapshot(e.newValue);
    if (s) onSnapshot(s);
  };
  // A dedicated channel object per subscriber: a BroadcastChannel does not
  // receive its own posts, and the publisher may live in the same window.
  const listen = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SCOREBOARD_CHANNEL) : null;
  listen?.addEventListener('message', fromChannel);
  window.addEventListener('storage', fromStorage);
  return () => {
    listen?.removeEventListener('message', fromChannel);
    listen?.close();
    window.removeEventListener('storage', fromStorage);
  };
};

let lastStamp = 0;
/** Strictly increasing publish time, so two changes in one millisecond both count. */
export const nextStamp = (now: number = Date.now()): number => {
  lastStamp = Math.max(now, lastStamp + 1);
  return lastStamp;
};

/** A snapshot without its envelope — what the game screen describes. */
export type ScoreboardData = Omit<ScoreboardSnapshot, 'v' | 'updatedAt'>;
