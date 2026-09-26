import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Match, Player, Dart, Throw, GameType, MatchSettings } from '../types/index';
import { calculateThrowScore, calculateAverage } from '../utils/scoring';
import { evaluateVisit, rulesOf } from '../utils/visit';
import { getCheckoutSuggestion } from '../data/checkoutTable';
import audioSystem from '../utils/audio';
import { useTenant } from './TenantContext';
import { usePlayer } from './PlayerContext';
import { api } from '../services/api';
import logger from '../utils/logger';
import { logBuffer } from '../utils/logBuffer';

export interface GameState {
  currentMatch: Match | null;
  checkoutSuggestion: string[] | null;
  currentPlayerIndex: number;
  currentThrow: Dart[];
}

type GameAction =
  | { type: 'START_MATCH'; payload: { players: Player[]; settings: MatchSettings; gameType: GameType } }
  | { type: 'LOAD_MATCH'; payload: Match }
  | { type: 'ADD_DART'; payload: Dart }
  | { type: 'REMOVE_DART' }
  | { type: 'CLEAR_THROW' }
  | { type: 'REPLACE_DART'; payload: { index: number; dart: Dart } }
  | { type: 'CONFIRM_THROW' }
  | { type: 'UNDO_THROW' }
  | { type: 'REMOVE_PLAYER'; payload: { playerId: string } }
  | { type: 'NEXT_PLAYER' }
  | { type: 'END_MATCH' }
  | { type: 'UNDO_END_MATCH' }
  | { type: 'PAUSE_MATCH' }
  | { type: 'RESUME_MATCH' }
  | { type: 'UPDATE_CHECKOUT_SUGGESTION' };

/**
 * A match needs at least two players — REMOVE_PLAYER refuses to strip it down
 * to a solo run. The UI hides the remove control at this count.
 */
export const MIN_MATCH_PLAYERS = 2;

export const initialState: GameState = {
  currentMatch: null,
  checkoutSuggestion: null,
  currentPlayerIndex: 0,
  currentThrow: [],
};

/**
 * Checkout suggestion for the player at `playerIndex` after `darts` of the
 * current visit. Goes through evaluateVisit so double-in is respected.
 */
const checkoutFor = (match: Match, playerIndex: number, darts: Dart[]): string[] | null => {
  const player = match.players[playerIndex];
  const leg = match.legs[match.currentLegIndex];
  if (!player || !leg) return null;
  const rules = rulesOf(match.settings);
  const v = evaluateVisit(rules, leg.throws, player.playerId, darts);
  if (v.bust || darts.length >= 3) return null;
  const remaining = v.newRemaining;
  if (remaining > 170 || remaining < 1) return null;
  return getCheckoutSuggestion(remaining, 3 - darts.length, rules.doubleOut);
};

/**
 * Replays the legs in order to work out legsWon (per SET) and setsWon.
 * legsWon resets whenever a set is won, so it cannot be counted from the
 * leg winners of the whole match — that is what corrupted undo in sets
 * matches. Mirrors the transitions in CONFIRM_THROW exactly.
 */
export const replaySets = (
  legs: Match['legs'],
  playerIds: string[],
  settings: MatchSettings,
): { legsWon: Record<string, number>; setsWon: Record<string, number>; setIndex: number } => {
  const legsToWin = settings.legsToWin || 3;
  const setsToWin = settings.setsToWin || 1;
  const isSetsMatch = setsToWin > 1;
  const legsWon: Record<string, number> = {};
  const setsWon: Record<string, number> = {};
  playerIds.forEach(id => { legsWon[id] = 0; setsWon[id] = 0; });
  let setIndex = 0;

  for (const leg of legs) {
    const w = leg.winner;
    if (!w || !(w in legsWon)) continue;
    legsWon[w]++;
    if (isSetsMatch && legsWon[w] >= legsToWin) {
      setsWon[w]++;
      if (setsWon[w] < setsToWin) {
        playerIds.forEach(id => { legsWon[id] = 0; });
        setIndex++;
      }
    }
  }
  return { legsWon, setsWon, setIndex };
};

/**
 * Takes back the last confirmed visit — also across a leg or set boundary,
 * and out of a completed match. The darts come back into the input so the
 * player can correct them.
 */
const undoLastThrow = (state: GameState): GameState => {
  const m = state.currentMatch;
  if (!m) return state;
  const n = m.players.length;

  let legs = m.legs;
  let legIndex = m.currentLegIndex;
  let legStart = m.legStartPlayerIndex ?? 0;

  if (!legs[legIndex] || legs[legIndex].throws.length === 0) {
    // The current leg is fresh: the visit to take back is the checkout that
    // closed the previous leg. Only the newest leg can be stepped out of.
    if (legIndex === 0 || legIndex !== legs.length - 1) return state;
    legs = legs.slice(0, -1);
    legIndex -= 1;
    // Every leg and set transition advances the starter by one.
    legStart = (legStart - 1 + n) % n;
  }

  const leg = legs[legIndex];
  if (!leg || leg.throws.length === 0) return state;
  const lastThrow = leg.throws[leg.throws.length - 1];
  const updatedLeg = { ...leg, throws: leg.throws.slice(0, -1), winner: undefined, completedAt: undefined };
  const updatedLegs = legs.map((l, i) => (i === legIndex ? updatedLeg : l));

  const startScore = m.settings.startScore || 501;
  const progress = replaySets(updatedLegs, m.players.map(p => p.playerId), m.settings);

  const updatedPlayers = m.players.map(p => {
    const player = { ...p };
    player.match180s = 0;
    player.match171Plus = 0;
    player.match140Plus = 0;
    player.match100Plus = 0;
    player.match60Plus = 0;
    player.matchHighestScore = 0;
    player.checkoutsHit = 0;
    player.checkoutAttempts = 0;

    const allPlayerThrows = updatedLegs.flatMap(l => l.throws.filter(t => t.playerId === player.playerId));
    allPlayerThrows.forEach(throwData => {
      const throwScore = throwData.isBust ? 0 : throwData.score;
      if (throwScore === 180) player.match180s++;
      else if (throwScore >= 171) player.match171Plus++;
      else if (throwScore >= 140) player.match140Plus++;
      else if (throwScore >= 100) player.match100Plus++;
      else if (throwScore >= 60) player.match60Plus++;
      if (throwScore > player.matchHighestScore) player.matchHighestScore = throwScore;
    });
    player.matchAverage = calculateAverage(allPlayerThrows);

    updatedLegs.forEach(l => {
      if (l.winner === player.playerId) player.checkoutsHit++;
      let runningTotal = 0;
      l.throws.filter(t => t.playerId === player.playerId).forEach(t => {
        const remainingBefore = startScore - runningTotal;
        if (remainingBefore <= 170 && remainingBefore > 0) player.checkoutAttempts++;
        runningTotal += t.score;
      });
    });

    player.legsWon = progress.legsWon[player.playerId] ?? 0;
    player.setsWon = progress.setsWon[player.playerId] ?? 0;
    return player;
  });

  const updatedMatch: Match = {
    ...m,
    players: updatedPlayers,
    legs: updatedLegs,
    currentLegIndex: legIndex,
    currentSetIndex: progress.setIndex,
    legStartPlayerIndex: legStart,
    status: m.status === 'completed' ? 'in-progress' : m.status,
    winner: undefined,
    completedAt: undefined,
  };

  const found = m.players.findIndex(p => p.playerId === lastThrow.playerId);
  const playerIndex = found >= 0 ? found : state.currentPlayerIndex;
  const currentThrow = lastThrow.darts || [];

  return {
    ...state,
    currentMatch: updatedMatch,
    currentPlayerIndex: playerIndex,
    currentThrow,
    checkoutSuggestion: checkoutFor(updatedMatch, playerIndex, currentThrow),
  };
};

/** A saved match must at least have a current leg and players to be playable. */
const isPlayableMatch = (match: Match | null | undefined): match is Match =>
  !!match &&
  Array.isArray(match.players) && match.players.length > 0 &&
  Array.isArray(match.legs) && !!match.legs[match.currentLegIndex] &&
  Array.isArray(match.legs[match.currentLegIndex].throws) &&
  !!match.settings;

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'LOAD_MATCH': {
      const match = action.payload;
      // A corrupt or stale localStorage entry must not crash the provider.
      if (!isPlayableMatch(match)) {
        logger.warn('LOAD_MATCH: discarding unplayable match', (match as Match | undefined)?.id);
        return state;
      }
      const currentLeg = match.legs[match.currentLegIndex];

      // Each player throws once per "round", offset by the leg's starting player
      const throwsInLeg = currentLeg.throws.length;
      const legStartPlayer = match.legStartPlayerIndex ?? 0;
      const currentPlayerIndex = (legStartPlayer + throwsInLeg) % match.players.length;

      logger.apiEvent('LOAD_MATCH: throws in leg:', throwsInLeg, 'current player index:', currentPlayerIndex);

      return {
        ...state,
        currentMatch: match,
        currentPlayerIndex,
        currentThrow: [],
        checkoutSuggestion: checkoutFor(match, currentPlayerIndex, []),
      };
    }
    
    case 'START_MATCH': {
      const { players, settings, gameType } = action.payload;
      logBuffer.log('info', 'game_event', 'START_MATCH', { gameType, playerCount: players.length, startScore: settings.startScore });
      const matchId = uuidv4();
      const legId = uuidv4();
      
      const match: Match = {
        id: matchId,
        type: gameType,
        settings,
        players: players.map(p => {
          logger.debug('Creating match player:', {
            name: p.name,
            isBot: p.isBot,
            botLevel: p.botLevel,
          });
          return {
            playerId: p.id,
            name: p.name,
            setsWon: 0,
            legsWon: 0,
            matchAverage: 0,
            matchHighestScore: 0,
            match180s: 0,
            match171Plus: 0,
            match140Plus: 0,
            match100Plus: 0,
            match60Plus: 0,
            checkoutAttempts: 0,
            checkoutsHit: 0,
            isBot: p.isBot,
            botLevel: p.botLevel,
          };
        }),
        legs: [{
          id: legId,
          throws: [],
          startedAt: new Date(),
        }],
        currentLegIndex: 0,
        currentSetIndex: 0,
        legStartPlayerIndex: 0,
        status: 'in-progress',
        startedAt: new Date(),
      };

      return {
        ...state,
        currentMatch: match,
        currentPlayerIndex: 0,
        currentThrow: [],
        checkoutSuggestion: null,
      };
    }
    
    case 'ADD_DART': {
      if (!state.currentMatch || state.currentThrow.length >= 3) return state;
      logBuffer.log('debug', 'game_event', 'ADD_DART', { segment: action.payload.segment, multiplier: action.payload.multiplier, score: calculateThrowScore([action.payload]), player: state.currentMatch.players[state.currentPlayerIndex]?.name });

      const newThrow = [...state.currentThrow, action.payload];
      return {
        ...state,
        currentThrow: newThrow,
        checkoutSuggestion: checkoutFor(state.currentMatch, state.currentPlayerIndex, newThrow),
      };
    }
    
    case 'REMOVE_DART': {
      if (state.currentThrow.length === 0) return state;
      const newThrow = state.currentThrow.slice(0, -1);
      if (!state.currentMatch) return { ...state, currentThrow: newThrow };
      return {
        ...state,
        currentThrow: newThrow,
        checkoutSuggestion: checkoutFor(state.currentMatch, state.currentPlayerIndex, newThrow),
      };
    }
    
    case 'REPLACE_DART': {
      if (!state.currentMatch || action.payload.index < 0 || action.payload.index >= state.currentThrow.length) return state;
      const replacedThrow = [...state.currentThrow];
      replacedThrow[action.payload.index] = action.payload.dart;
      return {
        ...state,
        currentThrow: replacedThrow,
        checkoutSuggestion: checkoutFor(state.currentMatch, state.currentPlayerIndex, replacedThrow),
      };
    }
    
    case 'CLEAR_THROW': {
      if (!state.currentMatch) return { ...state, currentThrow: [], checkoutSuggestion: null };
      return {
        ...state,
        currentThrow: [],
        checkoutSuggestion: checkoutFor(state.currentMatch, state.currentPlayerIndex, []),
      };
    }
    
    case 'CONFIRM_THROW': {
      if (!state.currentMatch || state.currentThrow.length === 0) return state;
      logBuffer.log('info', 'game_event', 'CONFIRM_THROW', { totalScore: calculateThrowScore(state.currentThrow), player: state.currentMatch.players[state.currentPlayerIndex]?.name, dartsCount: state.currentThrow.length });

      const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const visit = evaluateVisit(rulesOf(state.currentMatch.settings), currentLeg.throws, currentPlayer.playerId, state.currentThrow);
      const previousRemaining = visit.previousRemaining;
      const bustOccurred = visit.bust;
      const currentThrowScore = visit.rawScore;

      // Create the throw record
      const newThrow: Throw = {
        id: uuidv4(),
        playerId: currentPlayer.playerId,
        darts: state.currentThrow,
        score: visit.score,
        remaining: visit.newRemaining,
        timestamp: new Date(),
        isBust: bustOccurred,
        isCheckoutAttempt: previousRemaining <= 170,
        visitNumber: playerThrows.length + 1,
        runningAverage: 0, // Will calculate after adding
      };
      
      // Add throw to leg
      const updatedLeg = {
        ...currentLeg,
        throws: [...currentLeg.throws, newThrow],
      };
      
      // Check for leg win
      let legWon = false;
      if (visit.checkout) {
        updatedLeg.winner = currentPlayer.playerId;
        updatedLeg.completedAt = new Date();
        legWon = true;
        // Don't announce leg checkout here - will be announced later
        // (either as 'leg' if match continues, or 'match' if match is won)
      } else if (bustOccurred) {
        // Announce bust — read the thrown score first, then "No score"
        audioSystem.announceBust(currentThrowScore);
      }
      
      // Update match — deep copy players and legs to avoid mutations
      const updatedPlayers = state.currentMatch.players.map(p => ({ ...p }));
      const updatedPlayer = updatedPlayers[state.currentPlayerIndex];
      const updatedLegs = state.currentMatch.legs.map((l, i) =>
        i === state.currentMatch!.currentLegIndex ? updatedLeg : l
      );
      const updatedMatch = {
        ...state.currentMatch,
        players: updatedPlayers,
        legs: updatedLegs,
      };

      // Update player stats
      const throwScore = visit.score;
      if (throwScore === 180) updatedPlayer.match180s++;
      else if (throwScore >= 171) updatedPlayer.match171Plus++;
      else if (throwScore >= 140) updatedPlayer.match140Plus++;
      else if (throwScore >= 100) updatedPlayer.match100Plus++;
      else if (throwScore >= 60) updatedPlayer.match60Plus++;

      if (throwScore > updatedPlayer.matchHighestScore) {
        updatedPlayer.matchHighestScore = throwScore;
      }

      // Calculate running average
      const allPlayerThrows = updatedMatch.legs.flatMap(l =>
        l.throws.filter(t => t.playerId === updatedPlayer.playerId)
      );
      updatedPlayer.matchAverage = calculateAverage(allPlayerThrows);

      // Track checkout attempts (when remaining before throw was <= 170)
      if (previousRemaining <= 170) {
        updatedPlayer.checkoutAttempts++;
      }

      // Handle leg win
      if (legWon) {
        updatedPlayer.legsWon++;
        updatedPlayer.checkoutsHit++;

        // Match-scoped leg sequence number (1 = first leg of THIS match).
        // updatedMatch.legs still has the just-won leg as the last entry;
        // the new leg gets appended below.
        const legNumberInMatch = updatedMatch.legs.length;

        // Check for set/match win
        const legsToWin = state.currentMatch.settings.legsToWin || 3;
        const setsToWin = state.currentMatch.settings.setsToWin || 1;
        if (updatedPlayer.legsWon >= legsToWin) {
          const isSetsMatch = setsToWin > 1;
          // In a sets match, reaching legsToWin wins the current SET, not the
          // match. Only count sets for multi-set matches so single-set behaviour
          // (setsWon stays 0) is unchanged.
          if (isSetsMatch) {
            updatedPlayer.setsWon++;
          }

          const matchWon = !isSetsMatch || updatedPlayer.setsWon >= setsToWin;

          if (matchWon) {
            updatedMatch.winner = updatedPlayer.playerId;
            updatedMatch.status = 'completed';
            updatedMatch.completedAt = new Date();
            // For 'match' the sequence number is ignored entirely.
            audioSystem.announceCheckout(0, 'match');
          } else {
            // Set won but match continues. Announce the set, reset EVERY player's
            // legsWon for the new set, advance the set index, and start a fresh
            // leg. (The old code ended the match after the very first set here.)
            const setNumberInMatch = (updatedMatch.currentSetIndex ?? 0) + 1;
            audioSystem.announceCheckout(setNumberInMatch, 'set');

            updatedPlayers.forEach(p => { p.legsWon = 0; });
            updatedMatch.currentSetIndex = (updatedMatch.currentSetIndex ?? 0) + 1;

            // New set opens with a fresh leg; keep the per-leg starter alternating.
            const setStartPlayer = ((updatedMatch.legStartPlayerIndex ?? 0) + 1) % updatedMatch.players.length;
            updatedMatch.legStartPlayerIndex = setStartPlayer;

            const newSetLeg = {
              id: uuidv4(),
              throws: [],
              startedAt: new Date(),
            };
            updatedMatch.legs = [...updatedMatch.legs, newSetLeg];
            updatedMatch.currentLegIndex = updatedMatch.legs.length - 1;

            return {
              ...state,
              currentMatch: updatedMatch,
              currentThrow: [],
              checkoutSuggestion: null,
              currentPlayerIndex: setStartPlayer,
            };
          }
        } else {
          // Leg won but match not over - start new leg

          // Announce leg win — leg # within THIS match (not the checkout score)
          audioSystem.announceCheckout(legNumberInMatch, 'leg');

          // Alternate starting player for new leg
          const previousStartPlayer = updatedMatch.legStartPlayerIndex ?? 0;
          const newStartPlayer = (previousStartPlayer + 1) % updatedMatch.players.length;
          updatedMatch.legStartPlayerIndex = newStartPlayer;

          const newLegId = uuidv4();
          const newLeg = {
            id: newLegId,
            throws: [],
            startedAt: new Date(),
          };
          updatedMatch.legs = [...updatedMatch.legs, newLeg];
          updatedMatch.currentLegIndex = updatedMatch.legs.length - 1;

          // Set starting player for new leg (alternating)
          return {
            ...state,
            currentMatch: updatedMatch,
            currentThrow: [],
            checkoutSuggestion: null,
            currentPlayerIndex: newStartPlayer,
          };
        }
      }
      
      return {
        ...state,
        currentMatch: updatedMatch,
        currentThrow: [],
        checkoutSuggestion: null,
      };
    }
    
    case 'NEXT_PLAYER': {
      if (!state.currentMatch) return state;
      const nextIndex = (state.currentPlayerIndex + 1) % state.currentMatch.players.length;
      logger.debug('NEXT_PLAYER:', {
        from: state.currentPlayerIndex,
        to: nextIndex,
        playerName: state.currentMatch.players[nextIndex]?.name,
      });
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        currentThrow: [],
        checkoutSuggestion: checkoutFor(state.currentMatch, nextIndex, []),
      };
    }
    
    case 'UNDO_THROW':
      return undoLastThrow(state);
    
    case 'REMOVE_PLAYER': {
      if (!state.currentMatch) return state;

      const { playerId } = action.payload;
      const removedIndex = state.currentMatch.players.findIndex(p => p.playerId === playerId);
      if (removedIndex === -1) return state;
      // A match is a match: never strip it down below two players.
      if (state.currentMatch.players.length <= MIN_MATCH_PLAYERS) return state;

      const removedPlayer = state.currentMatch.players[removedIndex];
      logBuffer.log('info', 'game_event', 'REMOVE_PLAYER', {
        matchId: state.currentMatch.id,
        playerId,
        name: removedPlayer.name,
        playersLeft: state.currentMatch.players.length - 1,
      });

      const remainingPlayers = state.currentMatch.players.filter(p => p.playerId !== playerId);

      // Drop the removed player's throws so the match reads as if they had never
      // been in it. The remaining players' stats are NOT recomputed on purpose:
      // average, 180s, highest score and legsWon all derive from their OWN throws,
      // which this action never touches. (Recomputing legsWon from leg winners
      // would break sets matches, where legsWon is reset per set.)
      const updatedLegs = state.currentMatch.legs.map(leg => {
        const throws = leg.throws.filter(t => t.playerId !== playerId);
        const wonByRemoved = leg.winner === playerId;
        if (throws.length === leg.throws.length && !wonByRemoved) return leg;
        return {
          ...leg,
          throws,
          // A leg the removed player had won belongs to nobody now.
          winner: wonByRemoved ? undefined : leg.winner,
          completedAt: wonByRemoved ? undefined : leg.completedAt,
        };
      });

      // Shift the turn pointer. Removing a player BEFORE the current one moves
      // everyone down a slot; removing the current player leaves the index
      // pointing at whoever was next (the modulo wraps when it was the last slot).
      const shiftIndex = (index: number) =>
        (index - (removedIndex < index ? 1 : 0)) % remainingPlayers.length;

      const nextPlayerIndex = shiftIndex(state.currentPlayerIndex);
      const removedWasCurrent = removedIndex === state.currentPlayerIndex;

      const updatedMatch: Match = {
        ...state.currentMatch,
        players: remainingPlayers,
        legs: updatedLegs,
        legStartPlayerIndex: shiftIndex(state.currentMatch.legStartPlayerIndex ?? 0),
      };

      // The pending darts belong to the player who was at the oche — they die
      // with them, but survive when somebody else was removed.
      const currentThrow = removedWasCurrent ? [] : state.currentThrow;

      const checkoutSuggestion = checkoutFor(updatedMatch, nextPlayerIndex, currentThrow);

      return {
        ...state,
        currentMatch: updatedMatch,
        currentPlayerIndex: nextPlayerIndex,
        currentThrow,
        checkoutSuggestion,
      };
    }

    case 'END_MATCH': {
      if (!state.currentMatch) return state;
      logBuffer.log('info', 'game_event', 'END_MATCH', { matchId: state.currentMatch.id, winner: state.currentMatch.winner });

      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          status: 'completed',
          completedAt: new Date(),
        },
      };
    }
    
    case 'UNDO_END_MATCH': {
      if (!state.currentMatch || state.currentMatch.status !== 'completed') return state;

      // Won by a checkout: reopening only the status would leave the final leg
      // with a winner and no way to continue. Take the checkout back instead.
      if (state.currentMatch.winner) return undoLastThrow(state);

      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          status: 'in-progress',
          completedAt: undefined,
          winner: undefined,
        },
      };
    }
    
    case 'PAUSE_MATCH': {
      if (!state.currentMatch) return state;
      logBuffer.log('info', 'game_event', 'PAUSE_MATCH', { matchId: state.currentMatch.id });

      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          status: 'paused',
          pausedAt: new Date(),
        },
      };
    }
    
    case 'RESUME_MATCH': {
      if (!state.currentMatch) return state;
      logBuffer.log('info', 'game_event', 'RESUME_MATCH', { matchId: state.currentMatch.id });

      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          status: 'in-progress',
          pausedAt: undefined,
        },
      };
    }
    
    default:
      return state;
  }
};

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  syncPlayerStats: (liveUpdate?: boolean) => void;
  pauseCurrentMatch: () => Promise<void>;
  loadMatchFromDb: (matchId: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const reviveMatchDates = (match: any): Match => {
  // Import inline to avoid circular dependency
  const toDateOrNow = (value: unknown): Date => {
    if (value === null || value === undefined) return new Date();
    if (value instanceof Date) return isNaN(value.getTime()) ? new Date() : value;
    if (typeof value === 'number') {
      const timestamp = value < 10000000000 ? value * 1000 : value;
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  };

  const toDateOrUndefined = (value: unknown): Date | undefined => {
    if (value === null || value === undefined) return undefined;
    if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
    if (typeof value === 'number') {
      const timestamp = value < 10000000000 ? value * 1000 : value;
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? undefined : date;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  };

  return {
    ...match,
    startedAt: toDateOrNow(match.startedAt),
    completedAt: toDateOrUndefined(match.completedAt),
    pausedAt: toDateOrUndefined(match.pausedAt),
    legs: match.legs?.map((leg: any) => ({
      ...leg,
      startedAt: toDateOrNow(leg.startedAt),
      completedAt: toDateOrUndefined(leg.completedAt),
      throws: leg.throws?.map((t: any) => ({
        ...t,
        timestamp: toDateOrNow(t.timestamp),
      })) || [],
    })) || [],
  };
};

const ACTIVE_MATCH_KEY = 'state-of-the-dart-active-match';

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { storage } = useTenant();
  const { updatePlayer, players, updatePlayerHeatmap } = usePlayer();

  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Restore active match from localStorage on mount
  useEffect(() => {
    const savedMatch = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (savedMatch && !state.currentMatch) {
      try {
        const parsed = JSON.parse(savedMatch);
        // Only restore if match is still in progress or paused
        if (parsed.status === 'in-progress' || parsed.status === 'paused') {
          const restoredMatch = reviveMatchDates(parsed);
          logger.apiEvent('Restoring active match from localStorage:', restoredMatch.id);
          dispatch({ type: 'LOAD_MATCH', payload: restoredMatch });
        } else {
          // Match was completed, clear it
          localStorage.removeItem(ACTIVE_MATCH_KEY);
        }
      } catch (err) {
        logger.warn('Failed to restore match from localStorage:', err);
        localStorage.removeItem(ACTIVE_MATCH_KEY);
      }
    }
  }, []); // Only run once on mount

  // Save active match to localStorage whenever it changes
  useEffect(() => {
    if (state.currentMatch) {
      if (state.currentMatch.status === 'in-progress' || state.currentMatch.status === 'paused') {
        localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(state.currentMatch));
      } else if (state.currentMatch.status === 'completed') {
        // Match completed, remove from localStorage
        localStorage.removeItem(ACTIVE_MATCH_KEY);
      }
    } else {
      localStorage.removeItem(ACTIVE_MATCH_KEY);
    }
  }, [state.currentMatch]);
  
  // Helper: Transform match for API (maps frontend format to API format)
  const transformMatchForApi = (match: Match) => ({
    id: match.id,
    gameType: match.type, // API expects 'gameType', frontend uses 'type'
    status: match.status,
    players: match.players,
    settings: match.settings,
    startedAt: match.startedAt ? new Date(match.startedAt).getTime() : Date.now(),
    completedAt: match.completedAt ? new Date(match.completedAt).getTime() : undefined,
    winner: match.winner,
    legs: match.legs,
  });

  // Track if match has been created in DB
  const matchCreatedRef = React.useRef<string | null>(null);
  // Track if a create/update operation is in progress to prevent race conditions
  const matchSavingRef = React.useRef<boolean>(false);
  // Track last saved state to prevent unnecessary saves
  const lastSavedStateRef = React.useRef<string>('');

  // Save game state to API with debouncing (during active game)
  // Save match to API with debouncing and dependency tracking
  useEffect(() => {
    if (!state.currentMatch || state.currentMatch.status !== 'in-progress') {
      return;
    }

    const matchId = state.currentMatch.id;
    const abortController = new AbortController();
    let isMounted = true;

    // Create a stable state string for comparison to prevent unnecessary saves
    const currentStateString = JSON.stringify({
      id: matchId,
      status: state.currentMatch.status,
      currentLegIndex: state.currentMatch.currentLegIndex,
      currentPlayerIndex: state.currentPlayerIndex,
      // Player count matters: removing a player may leave leg/throw counts
      // untouched, and without this the save would be skipped as "unchanged".
      playersCount: state.currentMatch.players.length,
      legsCount: state.currentMatch.legs.length,
      lastLegThrowsCount: state.currentMatch.legs[state.currentMatch.currentLegIndex]?.throws.length || 0,
    });

    // Only save if state actually changed
    if (lastSavedStateRef.current === currentStateString) {
      return;
    }

    const saveTimer = setTimeout(async () => {
      if (!isMounted) return;
      
      // Prevent concurrent save operations
      if (matchSavingRef.current) {
        return;
      }

      matchSavingRef.current = true;
      const apiMatch = transformMatchForApi(state.currentMatch!);

      try {
        // If we haven't created this match yet, create it first
        if (matchCreatedRef.current !== matchId) {
          try {
            await api.matches.create(apiMatch, { signal: abortController.signal });
            matchCreatedRef.current = matchId;
            logger.success('Match created in DB:', matchId);
          } catch (createError: any) {
            // If aborted, exit silently
            if (createError.name === 'AbortError' || !isMounted) return;
            // If it already exists (409 conflict), mark as created and continue.
            // apiClient attaches `status` to the thrown error; older code checked the
            // non-existent `.response.status`, so this branch never ran.
            if (createError?.status === 409 || /\b409\b/.test(createError?.message ?? '')) {
              matchCreatedRef.current = matchId;
            } else {
              logger.warn('Match create failed:', createError);
            }
          }
        } else {
          // Match exists, update it
          await api.matches.update(matchId, apiMatch, { signal: abortController.signal });
        }
        
        // Update last saved state only on success
        if (isMounted) {
          lastSavedStateRef.current = currentStateString;
        }
      } catch (error: any) {
        // If aborted, exit silently
        if (error.name === 'AbortError' || !isMounted) return;
        // Silently fail - don't block the game
        logger.warn('Match save failed:', error);
      } finally {
        // Always reset the saving flag to prevent permanent blocking
        matchSavingRef.current = false;
      }
    }, 2000); // Increased debounce to 2 seconds to reduce request frequency

    return () => {
      isMounted = false;
      clearTimeout(saveTimer);
      abortController.abort(); // Cancel any in-flight API calls
      matchSavingRef.current = false; // Reset saving flag on cleanup
    };
  }, [state.currentMatch?.id, state.currentMatch?.status, state.currentMatch?.currentLegIndex, state.currentPlayerIndex, state.currentMatch?.legs.length]);

  // Reset match created ref when match ID changes
  useEffect(() => {
    if (!state.currentMatch) {
      matchCreatedRef.current = null;
    }
  }, [state.currentMatch?.id]);

  // Save match when paused (before navigating away)
  useEffect(() => {
    if (state.currentMatch?.status === 'paused') {
      // Skip if already saving to prevent duplicate requests
      if (matchSavingRef.current) {
        logger.debug('Skipping paused save - already saving');
        return;
      }

      const apiMatch = transformMatchForApi(state.currentMatch);
      const matchId = state.currentMatch.id;

      matchSavingRef.current = true;

      // Try to save immediately when paused
      (async () => {
        try {
          if (matchCreatedRef.current !== matchId) {
            await api.matches.create(apiMatch);
            matchCreatedRef.current = matchId;
          } else {
            await api.matches.update(matchId, apiMatch);
          }
          logger.success('Paused match saved');
        } catch (err: any) {
          // Don't warn on rate limiting - it's not critical
          if (!err?.message?.includes('429')) {
            logger.warn('Failed to save paused match:', err);
          }
          // Don't throw - allow navigation to continue
        } finally {
          matchSavingRef.current = false;
        }
      })();
    }
  }, [state.currentMatch?.status]);
  
  // Sync player statistics to PlayerContext (called during and after match)
  const syncPlayerStats = (liveUpdate: boolean = false) => {
    if (!state.currentMatch || !storage) return;
    
    // Only save to match history if completed
    const shouldSaveMatch = state.currentMatch.status === 'completed' && !liveUpdate;
    
    // Save completed match to database
    if (shouldSaveMatch) {
      const apiMatch = transformMatchForApi(state.currentMatch!);
      api.matches.create(apiMatch)
        .then(() => logger.success('Match saved to database'))
        .catch((err: Error) => logger.error('Failed to save match:', err));
    }
    
    state.currentMatch.players.forEach((matchPlayer) => {
      const player = players.find(p => p.id === matchPlayer.playerId);
      if (!player) return;
      
      const isWinner = state.currentMatch!.winner === matchPlayer.playerId;
      const legsWon = matchPlayer.legsWon;
      const legsPlayed = state.currentMatch!.legs.length;
      
      // For live updates, update current performance stats but not permanent records
      if (liveUpdate) {
        // Get all checkouts from completed legs
        const playerLegsWon = state.currentMatch!.legs.filter(
          leg => leg.winner === matchPlayer.playerId && leg.completedAt
        );
        const checkoutsFromLegs = playerLegsWon
          .map(leg => {
            const lastThrow = leg.throws[leg.throws.length - 1];
            return lastThrow?.score || 0;
          })
          .filter(score => score > 0);
        
        const highestCheckoutThisMatch = Math.max(0, ...checkoutsFromLegs);
        
        // Fire and forget - don't block on live updates
        updatePlayer(matchPlayer.playerId, {
          stats: {
            ...player.stats,
            // Update these live during the game (best performances)
            bestAverage: Math.max(player.stats.bestAverage, matchPlayer.matchAverage),
            highestCheckout: Math.max(player.stats.highestCheckout, highestCheckoutThisMatch),
          },
        }).catch(err => logger.warn('Live stats update failed:', err));
        return; // Skip the rest for live updates
      }
      
      // Calculate highest checkout from match
      const playerLegsWon = state.currentMatch!.legs.filter(
        leg => leg.winner === matchPlayer.playerId
      );
      const checkoutsFromLegs = playerLegsWon
        .map(leg => {
          const lastThrow = leg.throws[leg.throws.length - 1];
          return lastThrow?.score || 0;
        })
        .filter(score => score > 0);
      
      const highestCheckout = Math.max(
        player.stats.highestCheckout,
        ...checkoutsFromLegs
      );
      
      // Update player stats - fire and forget to not block UI
      const checkoutStats = calculateCheckoutPercentage(
        player.stats.totalCheckoutAttempts || 0,
        player.stats.totalCheckoutHits || 0,
        matchPlayer.checkoutAttempts,
        matchPlayer.checkoutsHit
      );

      updatePlayer(matchPlayer.playerId, {
        stats: {
          ...player.stats,
          gamesPlayed: player.stats.gamesPlayed + 1,
          gamesWon: player.stats.gamesWon + (isWinner ? 1 : 0),
          totalLegsPlayed: player.stats.totalLegsPlayed + legsPlayed,
          totalLegsWon: player.stats.totalLegsWon + legsWon,
          highestCheckout: highestCheckout,
          total180s: player.stats.total180s + matchPlayer.match180s,
          total171Plus: player.stats.total171Plus + matchPlayer.match171Plus,
          total140Plus: player.stats.total140Plus + matchPlayer.match140Plus,
          total100Plus: player.stats.total100Plus + matchPlayer.match100Plus,
          total60Plus: player.stats.total60Plus + matchPlayer.match60Plus,
          bestAverage: Math.max(player.stats.bestAverage, matchPlayer.matchAverage),
          averageOverall: calculateOverallAverage(
            player.stats.averageOverall,
            player.stats.gamesPlayed,
            matchPlayer.matchAverage
          ),
          checkoutPercentage: checkoutStats.percentage,
          totalCheckoutAttempts: checkoutStats.totalAttempts,
          totalCheckoutHits: checkoutStats.totalHits,
        },
      }).catch(err => logger.warn('Final stats update failed:', err));
    });
  };
  
  // Auto-sync when match is completed
  useEffect(() => {
    if (state.currentMatch?.status === 'completed') {
      syncPlayerStats(false); // Final sync
    }
  }, [state.currentMatch?.status]);
  
  // Live sync during game (every throw)
  // Use specific dependencies to avoid unnecessary re-renders
  const currentLegThrowsCount = state.currentMatch?.legs[state.currentMatch.currentLegIndex]?.throws.length ?? 0;

  useEffect(() => {
    if (state.currentMatch && state.currentMatch.status === 'in-progress') {
      syncPlayerStats(true); // Live update
    }
  }, [currentLegThrowsCount, state.currentMatch?.currentLegIndex]);

  // Track last processed throw to avoid duplicate heatmap updates
  const lastProcessedThrowIdRef = React.useRef<string | null>(null);

  // Update heatmap data when throws are confirmed
  useEffect(() => {
    if (!state.currentMatch || state.currentMatch.status !== 'in-progress') return;

    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (!currentLeg || currentLeg.throws.length === 0) return;

    // Get the last throw and update heatmap for that player
    const lastThrow = currentLeg.throws[currentLeg.throws.length - 1];

    // Skip if we already processed this throw
    if (!lastThrow || lastThrow.id === lastProcessedThrowIdRef.current) return;

    if (lastThrow.darts && lastThrow.darts.length > 0) {
      logger.gameEvent('Updating heatmap for player:', lastThrow.playerId, 'with darts:', lastThrow.darts);
      updatePlayerHeatmap(lastThrow.playerId, lastThrow.darts);
      lastProcessedThrowIdRef.current = lastThrow.id;
    }
  }, [state.currentMatch?.legs, updatePlayerHeatmap]);

  // Pause the current match: dispatch PAUSE_MATCH and wait for DB save
  const pauseCurrentMatch = async (): Promise<void> => {
    if (!state.currentMatch || state.currentMatch.status !== 'in-progress') return;

    dispatch({ type: 'PAUSE_MATCH' });

    // The paused-save effect will fire, but we also do an immediate save
    // to guarantee persistence before a new match starts.
    const apiMatch = transformMatchForApi({
      ...state.currentMatch,
      status: 'paused',
      pausedAt: new Date(),
    });
    const matchId = state.currentMatch.id;

    try {
      if (matchCreatedRef.current !== matchId) {
        await api.matches.create(apiMatch);
        matchCreatedRef.current = matchId;
      } else {
        await api.matches.update(matchId, apiMatch);
      }
      logger.success('Match paused and saved:', matchId);
    } catch (err) {
      logger.warn('Failed to save paused match (pauseCurrentMatch):', err);
    }
  };

  // Load a match from the DB by fetching its full details
  const loadMatchFromDb = (matchId: string) => {
    matchCreatedRef.current = matchId;
    lastSavedStateRef.current = '';
  };

  return (
    <GameContext.Provider value={{ state, dispatch, syncPlayerStats, pauseCurrentMatch, loadMatchFromDb }}>
      {children}
    </GameContext.Provider>
  );
};

// Helper function to calculate overall average
const calculateOverallAverage = (
  currentAvg: number,
  gamesPlayed: number,
  newAvg: number
): number => {
  if (gamesPlayed === 0) return newAvg;
  return ((currentAvg * gamesPlayed) + newAvg) / (gamesPlayed + 1);
};

// Helper function to calculate checkout percentage
const calculateCheckoutPercentage = (
  currentTotalAttempts: number,
  currentTotalHits: number,
  newAttempts: number,
  newHits: number
): { percentage: number; totalAttempts: number; totalHits: number } => {
  const updatedAttempts = currentTotalAttempts + newAttempts;
  const updatedHits = currentTotalHits + newHits;

  return {
    percentage: updatedAttempts > 0 ? (updatedHits / updatedAttempts) * 100 : 0,
    totalAttempts: updatedAttempts,
    totalHits: updatedHits,
  };
};

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};