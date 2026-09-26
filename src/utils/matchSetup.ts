import { Match, MatchPlayer, MatchSettings } from '../types/index';

const LAST_SETTINGS_KEY = 'sotd-last-game-settings';

/** The standard game a new device starts with. */
export const DEFAULT_GAME_SETTINGS: MatchSettings = {
  startScore: 501,
  legsToWin: 3,
  setsToWin: 1,
  doubleOut: true,
  doubleIn: false,
};

/** Last used X01 settings, falling back to the standard game. */
export const loadLastGameSettings = (): MatchSettings => {
  try {
    const raw = localStorage.getItem(LAST_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_GAME_SETTINGS };
    const saved = JSON.parse(raw) as Partial<MatchSettings>;
    return { ...DEFAULT_GAME_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
};

export const saveLastGameSettings = (settings: MatchSettings): void => {
  try {
    const { startScore, legsToWin, setsToWin, doubleOut, doubleIn } = settings;
    localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify({ startScore, legsToWin, setsToWin, doubleOut, doubleIn }));
  } catch {
    // storage unavailable
  }
};

/**
 * Player order for a rematch: whoever threw second starts. The old rematch
 * reused the order, so the same player always had the throw.
 */
export const rotateForRematch = <T>(players: T[]): T[] =>
  players.length < 2 ? [...players] : [...players.slice(1), players[0]];

export interface Standing extends MatchPlayer {
  /** Legs won over the whole match (MatchPlayer.legsWon resets every set). */
  legsWon: number;
}

/**
 * Final table: winner first, then by sets, legs over the match and average.
 * The winner screen used to show "winner vs. the first other player", which is
 * wrong for three or more players.
 */
export const standings = (match: Match): Standing[] => {
  const legsInMatch = (id: string) => match.legs.filter(l => l.winner === id).length;
  return match.players
    .map(p => ({ ...p, legsWon: legsInMatch(p.playerId) }))
    .sort((a, b) =>
      Number(b.playerId === match.winner) - Number(a.playerId === match.winner) ||
      b.setsWon - a.setsWon ||
      b.legsWon - a.legsWon ||
      b.matchAverage - a.matchAverage,
    );
};

export const GUEST_NAME = 'Guest';
const GUEST_PATTERN = /^guest(\s+\d+)?$/i;

/**
 * The guest profile to reuse for a one-player start. Every solo start used to
 * create a fresh `Guest 417`, which piled up in the player list; now the one
 * called "Guest" is reused, or else an old numbered one.
 */
export const findReusableGuest = <P extends { name: string; isBot?: boolean }>(
  players: P[],
  exclude: string[] = [],
): P | undefined => {
  const guests = players.filter(p => !p.isBot && GUEST_PATTERN.test(p.name.trim()) && !exclude.includes((p as unknown as { id: string }).id));
  return guests.find(p => p.name.trim().toLowerCase() === GUEST_NAME.toLowerCase()) ?? guests[0];
};
