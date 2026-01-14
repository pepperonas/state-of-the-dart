/**
 * Personal Bests Tracking System
 */

export interface PersonalBests {
  playerId: string;
  
  // Scoring Records
  highestScore: {
    value: number;
    date: Date;
    gameId?: string;
  };
  
  bestAverage: {
    value: number;
    date: Date;
    gameId?: string;
  };
  
  most180s: {
    value: number;
    date: Date;
    gameId?: string;
  };
  
  // Checkout Records
  highestCheckout: {
    value: number;
    date: Date;
    gameId?: string;
  };
  
  bestCheckoutRate: {
    value: number; // percentage
    date: Date;
    gameId?: string;
  };
  
  // Game Records
  shortestLeg: {
    darts: number;
    date: Date;
    gameId?: string;
  };
  
  longestWinningStreak: {
    value: number;
    startDate: Date;
    endDate: Date;
  };
  
  mostLegsWon: {
    value: number;
    date: Date;
    gameId?: string;
  };
  
  // Career Stats
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  totalLegsWon: number;
  totalLegsLost: number;
  total180s: number;
  totalCheckouts: number;
  
  // First Recorded
  firstGameDate?: Date;
  lastGameDate?: Date;
}

export const createEmptyPersonalBests = (playerId: string): PersonalBests => ({
  playerId,
  highestScore: { value: 0, date: new Date() },
  bestAverage: { value: 0, date: new Date() },
  most180s: { value: 0, date: new Date() },
  highestCheckout: { value: 0, date: new Date() },
  bestCheckoutRate: { value: 0, date: new Date() },
  shortestLeg: { darts: 999, date: new Date() },
  longestWinningStreak: { value: 0, startDate: new Date(), endDate: new Date() },
  mostLegsWon: { value: 0, date: new Date() },
  totalGamesPlayed: 0,
  totalWins: 0,
  totalLosses: 0,
  totalLegsWon: 0,
  totalLegsLost: 0,
  total180s: 0,
  totalCheckouts: 0,
});

export const updatePersonalBests = (
  currentBests: PersonalBests,
  matchData: {
    matchAverage: number;
    highestScore: number;
    score180s: number;
    checkoutsHit: number;
    checkoutAttempts: number;
    legsWon: number;
    legsLost: number;
    isWinner: boolean;
    gameId: string;
    gameDate: Date;
    shortestLegDarts?: number;
  }
): PersonalBests => {
  const updated = { ...currentBests };
  const now = matchData.gameDate;

  // Update highest score
  if (matchData.highestScore > updated.highestScore.value) {
    updated.highestScore = {
      value: matchData.highestScore,
      date: now,
      gameId: matchData.gameId,
    };
  }

  // Update best average
  if (matchData.matchAverage > updated.bestAverage.value) {
    updated.bestAverage = {
      value: matchData.matchAverage,
      date: now,
      gameId: matchData.gameId,
    };
  }

  // Update most 180s
  if (matchData.score180s > updated.most180s.value) {
    updated.most180s = {
      value: matchData.score180s,
      date: now,
      gameId: matchData.gameId,
    };
  }

  // Update best checkout rate
  if (matchData.checkoutAttempts > 0) {
    const checkoutRate = (matchData.checkoutsHit / matchData.checkoutAttempts) * 100;
    if (checkoutRate > updated.bestCheckoutRate.value) {
      updated.bestCheckoutRate = {
        value: checkoutRate,
        date: now,
        gameId: matchData.gameId,
      };
    }
  }

  // Update shortest leg
  if (matchData.shortestLegDarts && matchData.shortestLegDarts < updated.shortestLeg.darts) {
    updated.shortestLeg = {
      darts: matchData.shortestLegDarts,
      date: now,
      gameId: matchData.gameId,
    };
  }

  // Update most legs won
  if (matchData.legsWon > updated.mostLegsWon.value) {
    updated.mostLegsWon = {
      value: matchData.legsWon,
      date: now,
      gameId: matchData.gameId,
    };
  }

  // Update career stats
  updated.totalGamesPlayed += 1;
  if (matchData.isWinner) {
    updated.totalWins += 1;
  } else {
    updated.totalLosses += 1;
  }
  updated.totalLegsWon += matchData.legsWon;
  updated.totalLegsLost += matchData.legsLost;
  updated.total180s += matchData.score180s;
  updated.totalCheckouts += matchData.checkoutsHit;

  // Update dates
  if (!updated.firstGameDate) {
    updated.firstGameDate = now;
  }
  updated.lastGameDate = now;

  return updated;
};
