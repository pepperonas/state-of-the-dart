import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Match, Player, Dart, Throw, Leg, GameType, GameStatus, MatchSettings } from '../types/index';
import { calculateThrowScore, isBust, calculateAverage } from '../utils/scoring';
import { getCheckoutSuggestion } from '../data/checkoutTable';
import audioSystem from '../utils/audio';

interface GameState {
  currentMatch: Match | null;
  checkoutSuggestion: string[] | null;
  currentPlayerIndex: number;
  currentThrow: Dart[];
}

type GameAction =
  | { type: 'START_MATCH'; payload: { players: Player[]; settings: MatchSettings; gameType: GameType } }
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
    case 'START_MATCH': {
      const { players, settings, gameType } = action.payload;
      const matchId = uuidv4();
      const legId = uuidv4();
      
      const match: Match = {
        id: matchId,
        type: gameType,
        settings,
        players: players.map(p => ({
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
        })),
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
      if (remaining <= 170 && remaining > 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3 - newThrow.length);
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
      if (remaining <= 170 && remaining > 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3 - newThrow.length);
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
      if (remaining <= 170 && remaining > 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3);
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
        darts: bustOccurred ? state.currentThrow : state.currentThrow,
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
        // Announce checkout
        audioSystem.announceCheckout(currentThrowScore, 'leg');
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
          updatedMatch.status = 'finished';
          updatedMatch.completedAt = new Date();
          
          // Announce set or match win
          if (state.currentMatch.settings.setsToWin && state.currentMatch.settings.setsToWin > 1) {
            audioSystem.announceCheckout(currentThrowScore, 'set');
          } else {
            audioSystem.announceCheckout(currentThrowScore, 'match');
          }
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
      
      // Calculate checkout suggestion for next player
      const nextPlayer = state.currentMatch.players[nextIndex];
      const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
      const playerThrows = currentLeg.throws.filter(t => t.playerId === nextPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const startScore = state.currentMatch.settings.startScore || 501;
      const remaining = startScore - totalScored;
      
      let checkoutSuggestion = null;
      if (remaining <= 170 && remaining > 1) {
        checkoutSuggestion = getCheckoutSuggestion(remaining, 3);
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

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Save game state to localStorage
  useEffect(() => {
    if (state.currentMatch) {
      localStorage.setItem('currentMatch', JSON.stringify(state.currentMatch));
    }
  }, [state.currentMatch]);
  
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};