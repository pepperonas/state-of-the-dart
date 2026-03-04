import { Dart, CricketState } from '../types/index';

export const STORAGE_KEYS = {
  ATC: 'state-of-the-dart-atc-game',
  SHANGHAI: 'state-of-the-dart-shanghai-game',
  CRICKET: 'state-of-the-dart-cricket-game',
};

const STALE_THRESHOLD = 48 * 60 * 60 * 1000; // 48h

interface SavedPlayer {
  id: string;
  name: string;
  avatar?: string;
}

export interface ATCSavedState {
  gameType: 'around-the-clock';
  selectedPlayers: SavedPlayer[];
  bullMode: 'off' | 'standard' | 'split';
  direction: 'ascending' | 'descending';
  variant: 'standard' | 'doubles' | 'triples';
  currentPlayerIndex: number;
  playerProgress: Record<string, number>;
  playerDarts: Record<string, number>;
  playerHits: Record<string, number>;
  turnHistory: Array<{
    playerId: string;
    playerIndex: number;
    darts: Dart[];
    prevProgress: number;
    prevDarts: number;
    prevHits: number;
  }>;
  elapsedTime: number;
  savedAt: number;
}

export interface ShanghaiSavedState {
  gameType: 'shanghai';
  selectedPlayers: SavedPlayer[];
  startNumber: number;
  rounds: number;
  currentRound: number;
  currentPlayerIndex: number;
  playerScores: Record<string, number>;
  roundScores: Record<string, Record<number, number>>;
  turnHistory: Array<{
    playerId: string;
    playerIndex: number;
    darts: Dart[];
    prevRound: number;
    prevScores: Record<string, number>;
    prevRoundScores: Record<string, Record<number, number>>;
  }>;
  savedAt: number;
}

export interface CricketSavedState {
  gameType: 'cricket';
  selectedPlayers: SavedPlayer[];
  cricketState: CricketState;
  currentPlayerIndex: number;
  savedAt: number;
}

type SavedState = ATCSavedState | ShanghaiSavedState | CricketSavedState;

export function saveGameState(key: string, state: SavedState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadGameState<T extends SavedState>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    if (Date.now() - parsed.savedAt > STALE_THRESHOLD) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearGameState(key: string): void {
  localStorage.removeItem(key);
}

export interface LocalGameSummary {
  storageKey: string;
  gameType: 'around-the-clock' | 'shanghai' | 'cricket';
  players: string[];
  savedAt: number;
  route: string;
  progressText: string;
}

export function getLocalGameSummaries(): LocalGameSummary[] {
  const summaries: LocalGameSummary[] = [];

  const atc = loadGameState<ATCSavedState>(STORAGE_KEYS.ATC);
  if (atc) {
    const totalTargets = atc.variant === 'standard' || atc.variant === 'doubles' || atc.variant === 'triples'
      ? 20 + (atc.bullMode === 'split' ? 2 : atc.bullMode === 'standard' ? 1 : 0)
      : 20;
    const maxProgress = Math.max(...Object.values(atc.playerProgress), 0);
    summaries.push({
      storageKey: STORAGE_KEYS.ATC,
      gameType: 'around-the-clock',
      players: atc.selectedPlayers.map(p => p.name),
      savedAt: atc.savedAt,
      route: '/around-the-clock',
      progressText: `${maxProgress}/${totalTargets}`,
    });
  }

  const shanghai = loadGameState<ShanghaiSavedState>(STORAGE_KEYS.SHANGHAI);
  if (shanghai) {
    summaries.push({
      storageKey: STORAGE_KEYS.SHANGHAI,
      gameType: 'shanghai',
      players: shanghai.selectedPlayers.map(p => p.name),
      savedAt: shanghai.savedAt,
      route: '/shanghai',
      progressText: `${shanghai.currentRound + 1}/${shanghai.rounds}`,
    });
  }

  const cricket = loadGameState<CricketSavedState>(STORAGE_KEYS.CRICKET);
  if (cricket) {
    summaries.push({
      storageKey: STORAGE_KEYS.CRICKET,
      gameType: 'cricket',
      players: cricket.selectedPlayers.map(p => p.name),
      savedAt: cricket.savedAt,
      route: '/cricket',
      progressText: '',
    });
  }

  return summaries;
}
