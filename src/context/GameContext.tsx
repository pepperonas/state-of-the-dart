import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Match, Player, Dart, Throw, GameType, MatchSettings } from '../types/index';
import { calculateThrowScore, isBust, calculateAverage } from '../utils/scoring';
import { getCheckoutSuggestion } from '../data/checkoutTable';
import audioSystem from '../utils/audio';
import { useTenant } from './TenantContext';
import { usePlayer } from './PlayerContext';
import { api } from '../services/api';

interface GameState {
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
  | { type: 'CONFIRM_THROW' }
  | { type: 'UNDO_THROW' }
  | { type: 'NEXT_PLAYER' }
  | { type: 'END_MATCH' }
  | { type: 'PAUSE_MATCH' }
  | { type: 'RESUME_MATCH' }
  | { type: 'UPDATE_CHECKOUT_SUGGESTION' };

const initialState: GameState = {
  currentMatch: null,
  checkoutSuggestion: null,
  currentPlayerIndex: 0,
  currentThrow: [],
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'LOAD_MATCH': {
      const match = action.payload;
      const currentLeg = match.legs[match.currentLegIndex];

      // Calculate which player's turn it is based on throw count
      // In darts, players alternate throws, so we count throws to determine current player
      const throwsInLeg = currentLeg.throws.length;
      const numPlayers = match.players.length;

      // Each player throws once per "round", so current player = throwsInLeg % numPlayers
      const currentPlayerIndex = throwsInLeg % numPlayers;

      const currentPlayer = match.players[currentPlayerIndex];
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const startScore = match.settings.startScore || 501;
      const remaining = startScore - totalScored;

      let checkoutSuggestion = null;
      const requireDouble = match.settings.doubleOut ?? true;
      if (remaining <= 170 && remaining >= 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3, requireDouble);
      }

      console.log('🔄 LOAD_MATCH: throws in leg:', throwsInLeg, 'current player index:', currentPlayerIndex);

      return {
        ...state,
        currentMatch: match,
        currentPlayerIndex,
        currentThrow: [],
        checkoutSuggestion,
      };
    }
    
    case 'START_MATCH': {
      const { players, settings, gameType } = action.payload;
      const matchId = uuidv4();
      const legId = uuidv4();
      
      const match: Match = {
        id: matchId,
        type: gameType,
        settings,
        players: players.map(p => {
          console.log('🎮 Creating match player:', {
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
      
      const newThrow = [...state.currentThrow, action.payload];
      const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      
      // Calculate remaining score
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const currentThrowScore = calculateThrowScore(newThrow);
      const startScore = state.currentMatch.settings.startScore || 501;
      const remaining = startScore - totalScored - currentThrowScore;
      
      // Update checkout suggestion
      let checkoutSuggestion = null;
      const requireDouble = state.currentMatch.settings.doubleOut ?? true;
      if (remaining <= 170 && remaining >= 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3 - newThrow.length, requireDouble);
      }
      
      return {
        ...state,
        currentThrow: newThrow,
        checkoutSuggestion,
      };
    }
    
    case 'REMOVE_DART': {
      if (state.currentThrow.length === 0) return state;
      
      const newThrow = state.currentThrow.slice(0, -1);
      
      // Recalculate checkout suggestion if needed
      if (!state.currentMatch) return { ...state, currentThrow: newThrow };
      
      const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const currentThrowScore = calculateThrowScore(newThrow);
      const startScore = state.currentMatch.settings.startScore || 501;
      const remaining = startScore - totalScored - currentThrowScore;

      let checkoutSuggestion = null;
      const requireDouble = state.currentMatch.settings.doubleOut ?? true;
      if (remaining <= 170 && remaining >= 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3 - newThrow.length, requireDouble);
      }

      return {
        ...state,
        currentThrow: newThrow,
        checkoutSuggestion,
      };
    }
    
    case 'CLEAR_THROW': {
      // Clear all darts at once
      if (!state.currentMatch) return { ...state, currentThrow: [], checkoutSuggestion: null };
      
      const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const startScore = state.currentMatch.settings.startScore || 501;
      const remaining = startScore - totalScored;
      
      let checkoutSuggestion = null;
      const requireDouble = state.currentMatch?.settings.doubleOut ?? true;
      if (remaining <= 170 && remaining >= 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3, requireDouble);
      }
      
      return {
        ...state,
        currentThrow: [],
        checkoutSuggestion,
      };
    }
    
    case 'CONFIRM_THROW': {
      if (!state.currentMatch || state.currentThrow.length === 0) return state;
      
      const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const currentThrowScore = calculateThrowScore(state.currentThrow);
      const startScore = state.currentMatch.settings.startScore || 501;
      const previousRemaining = startScore - totalScored;
      const newRemaining = previousRemaining - currentThrowScore;
      
      // Check for bust
      const requiresDouble = state.currentMatch.settings.doubleOut ?? true;
      const lastDart = state.currentThrow[state.currentThrow.length - 1];
      const bustOccurred = isBust(previousRemaining, currentThrowScore, requiresDouble, lastDart);
      
      // Create the throw record
      const newThrow: Throw = {
        id: uuidv4(),
        playerId: currentPlayer.playerId,
        darts: state.currentThrow,
        score: bustOccurred ? 0 : currentThrowScore,
        remaining: bustOccurred ? previousRemaining : newRemaining,
        timestamp: new Date(),
        isBust: bustOccurred,
        isCheckoutAttempt: newRemaining <= 170 && !bustOccurred,
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
      if (newRemaining === 0 && !bustOccurred) {
        updatedLeg.winner = currentPlayer.playerId;
        updatedLeg.completedAt = new Date();
        legWon = true;
        // Don't announce leg checkout here - will be announced later
        // (either as 'leg' if match continues, or 'match' if match is won)
      } else if (bustOccurred) {
        // Announce bust
        audioSystem.announceBust();
      }
      
      // Update match
      const updatedMatch = { ...state.currentMatch };
      updatedMatch.legs[state.currentMatch.currentLegIndex] = updatedLeg;
      
      // Update player stats
      const throwScore = bustOccurred ? 0 : currentThrowScore;
      if (throwScore === 180) currentPlayer.match180s++;
      else if (throwScore >= 171) currentPlayer.match171Plus++;
      else if (throwScore >= 140) currentPlayer.match140Plus++;
      else if (throwScore >= 100) currentPlayer.match100Plus++;
      else if (throwScore >= 60) currentPlayer.match60Plus++;
      
      if (throwScore > currentPlayer.matchHighestScore) {
        currentPlayer.matchHighestScore = throwScore;
      }
      
      // Calculate running average
      const allPlayerThrows = updatedMatch.legs.flatMap(l => 
        l.throws.filter(t => t.playerId === currentPlayer.playerId)
      );
      currentPlayer.matchAverage = calculateAverage(allPlayerThrows);
      
      // Handle leg win
      if (legWon) {
        currentPlayer.legsWon++;
        currentPlayer.checkoutsHit++;
        
        // Check for set/match win
        const legsToWin = state.currentMatch.settings.legsToWin || 3;
        if (currentPlayer.legsWon >= legsToWin) {
          // Set or match won
          updatedMatch.winner = currentPlayer.playerId;
          updatedMatch.status = 'completed';
          updatedMatch.completedAt = new Date();
          
          // Announce set or match win
          if (state.currentMatch.settings.setsToWin && state.currentMatch.settings.setsToWin > 1) {
            audioSystem.announceCheckout(currentThrowScore, 'set');
          } else {
            audioSystem.announceCheckout(currentThrowScore, 'match');
          }
        } else {
          // Leg won but match not over - start new leg

          // Announce leg checkout
          audioSystem.announceCheckout(currentThrowScore, 'leg');

          const newLegId = uuidv4();
          const newLeg = {
            id: newLegId,
            throws: [],
            startedAt: new Date(),
          };
          updatedMatch.legs.push(newLeg);
          updatedMatch.currentLegIndex = updatedMatch.legs.length - 1;

          // Reset to first player for new leg
          return {
            ...state,
            currentMatch: updatedMatch,
            currentThrow: [],
            checkoutSuggestion: null,
            currentPlayerIndex: 0,
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

      // Check if current leg is completed - if so, start from player 0 in new leg
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      let nextIndex = (state.currentPlayerIndex + 1) % state.currentMatch.players.length;

      console.log('➡️ NEXT_PLAYER:', {
        from: state.currentPlayerIndex,
        to: nextIndex,
        playerName: state.currentMatch.players[nextIndex].name,
        legWinner: currentLeg.winner,
      });

      // If current leg just completed and new leg started, reset to first player
      if (currentLeg.winner && state.currentPlayerIndex === state.currentMatch.players.length - 1) {
        nextIndex = 0;
        console.log('🔄 Leg completed, resetting to player 0');
      }

      // Calculate checkout suggestion for next player
      const nextPlayer = state.currentMatch.players[nextIndex];
      const playerThrows = currentLeg.throws.filter(t => t.playerId === nextPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const startScore = state.currentMatch.settings.startScore || 501;
      const remaining = startScore - totalScored;

      let checkoutSuggestion = null;
      const requireDouble = state.currentMatch?.settings.doubleOut ?? true;
      if (remaining <= 170 && remaining >= 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3, requireDouble);
      }

      return {
        ...state,
        currentPlayerIndex: nextIndex,
        currentThrow: [],
        checkoutSuggestion,
      };
    }
    
    case 'UNDO_THROW': {
      if (!state.currentMatch) return state;
      
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      if (currentLeg.throws.length === 0) return state;
      
      const lastThrow = currentLeg.throws[currentLeg.throws.length - 1];
      const updatedThrows = currentLeg.throws.slice(0, -1);
      
      const updatedLeg = {
        ...currentLeg,
        throws: updatedThrows,
        winner: undefined,
        completedAt: undefined,
      };
      
      const updatedMatch = { ...state.currentMatch };
      updatedMatch.legs[state.currentMatch.currentLegIndex] = updatedLeg;
      
      // Find the player who threw last
      const playerIndex = state.currentMatch.players.findIndex(p => p.playerId === lastThrow.playerId);
      
      return {
        ...state,
        currentMatch: updatedMatch,
        currentPlayerIndex: playerIndex >= 0 ? playerIndex : state.currentPlayerIndex,
        currentThrow: [],
      };
    }
    
    case 'END_MATCH': {
      if (!state.currentMatch) return state;
      
      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          status: 'completed',
          completedAt: new Date(),
        },
      };
    }
    
    case 'PAUSE_MATCH': {
      if (!state.currentMatch) return state;
      
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
}

const GameContext = createContext<GameContextValue | null>(null);

const reviveMatchDates = (match: any): Match => {
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
          console.log('🔄 Restoring active match from localStorage:', restoredMatch.id);
          dispatch({ type: 'LOAD_MATCH', payload: restoredMatch });
        } else {
          // Match was completed, clear it
          localStorage.removeItem(ACTIVE_MATCH_KEY);
        }
      } catch (err) {
        console.warn('Failed to restore match from localStorage:', err);
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

  // Save game state to API with debouncing (during active game)
  useEffect(() => {
    if (state.currentMatch && state.currentMatch.status === 'in-progress') {
      const matchId = state.currentMatch.id;
      const saveTimer = setTimeout(async () => {
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
              await api.matches.create(apiMatch);
              matchCreatedRef.current = matchId;
              console.log('✅ Match created in DB:', matchId);
            } catch (createError: any) {
              // If it already exists, mark as created and continue
              if (createError?.response?.status === 409) {
                matchCreatedRef.current = matchId;
              } else {
                console.warn('Match create failed:', createError);
              }
            }
          } else {
            // Match exists, update it
            await api.matches.update(matchId, apiMatch);
          }
        } catch (error) {
          // Silently fail - don't block the game
          console.warn('Match save failed:', error);
        } finally {
          matchSavingRef.current = false;
        }
      }, 1000); // Debounce: Save every 1 second

      return () => clearTimeout(saveTimer);
    }
  }, [state.currentMatch]);

  // Reset match created ref when match ID changes
  useEffect(() => {
    if (!state.currentMatch) {
      matchCreatedRef.current = null;
    }
  }, [state.currentMatch?.id]);

  // Save match when paused (before navigating away)
  useEffect(() => {
    if (state.currentMatch?.status === 'paused') {
      const apiMatch = transformMatchForApi(state.currentMatch);
      const matchId = state.currentMatch.id;

      // Try to save immediately when paused
      (async () => {
        try {
          if (matchCreatedRef.current !== matchId) {
            await api.matches.create(apiMatch);
            matchCreatedRef.current = matchId;
          } else {
            await api.matches.update(matchId, apiMatch);
          }
          console.log('✅ Paused match saved');
        } catch (err) {
          console.warn('Failed to save paused match:', err);
          // Don't throw - allow navigation to continue
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
        .then(() => console.log('✅ Match saved to database'))
        .catch((err: Error) => console.error('❌ Failed to save match:', err));
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
        }).catch(err => console.warn('Live stats update failed:', err));
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
          checkoutPercentage: calculateCheckoutPercentage(
            player.stats.checkoutPercentage,
            player.stats.gamesPlayed,
            matchPlayer.checkoutAttempts,
            matchPlayer.checkoutsHit
          ),
        },
      }).catch(err => console.warn('Final stats update failed:', err));
    });
  };
  
  // Auto-sync when match is completed
  useEffect(() => {
    if (state.currentMatch?.status === 'completed') {
      syncPlayerStats(false); // Final sync
    }
  }, [state.currentMatch?.status]);
  
  // Live sync during game (every throw)
  useEffect(() => {
    if (state.currentMatch && state.currentMatch.status === 'in-progress') {
      syncPlayerStats(true); // Live update
    }
  }, [state.currentMatch?.legs]);

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
      console.log('🎯 Updating heatmap for player:', lastThrow.playerId, 'with darts:', lastThrow.darts);
      updatePlayerHeatmap(lastThrow.playerId, lastThrow.darts);
      lastProcessedThrowIdRef.current = lastThrow.id;
    }
  }, [state.currentMatch?.legs, updatePlayerHeatmap]);

  return (
    <GameContext.Provider value={{ state, dispatch, syncPlayerStats }}>
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
  currentPercentage: number,
  gamesPlayed: number,
  newAttempts: number,
  newHits: number
): number => {
  if (gamesPlayed === 0 && newAttempts === 0) return 0;
  
  // Reconstruct total attempts and hits from current percentage
  const totalAttempts = gamesPlayed > 0 
    ? Math.round((currentPercentage / 100) * gamesPlayed * 10) // Estimate
    : 0;
  
  const totalHits = Math.round((totalAttempts * currentPercentage) / 100);
  
  const updatedAttempts = totalAttempts + newAttempts;
  const updatedHits = totalHits + newHits;
  
  return updatedAttempts > 0 ? (updatedHits / updatedAttempts) * 100 : 0;
};

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};