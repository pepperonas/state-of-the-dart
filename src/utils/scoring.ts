import { Dart, Throw, Leg, Match, MatchPlayer } from '../types/index';

export const calculateDartScore = (segment: number, multiplier: 0 | 1 | 2 | 3): number => {
  if (multiplier === 0) return 0; // miss
  if (segment === 25) {
    return multiplier === 1 ? 25 : 50; // outer bull or bull
  }
  if (segment === 50) return 50; // bull
  return segment * multiplier;
};

export const parseDartNotation = (notation: string): Dart => {
  notation = notation.toUpperCase().trim();
  
  // Handle miss
  if (notation === 'M' || notation === 'MISS' || notation === '0') {
    return { segment: 0, multiplier: 0, score: 0, bed: 'miss' };
  }
  
  // Handle bull
  if (notation === 'BULL' || notation === 'DB' || notation === 'B' || notation === '50') {
    return { segment: 50, multiplier: 2, score: 50, bed: 'bull' };
  }
  
  // Handle outer bull
  if (notation === 'OB' || notation === '25' || notation === 'SB') {
    return { segment: 25, multiplier: 1, score: 25, bed: 'outer-bull' };
  }
  
  // Parse format like T20, D16, S5
  const match = notation.match(/^([TDS])(\d+)$/);
  if (match) {
    const [, prefix, num] = match;
    const segment = parseInt(num);
    
    if (segment < 1 || segment > 20) {
      throw new Error(`Invalid segment: ${segment}`);
    }
    
    let multiplier: 1 | 2 | 3;
    let bed: 'single' | 'double' | 'triple';
    
    switch (prefix) {
      case 'T':
        multiplier = 3;
        bed = 'triple';
        break;
      case 'D':
        multiplier = 2;
        bed = 'double';
        break;
      case 'S':
      default:
        multiplier = 1;
        bed = 'single';
        break;
    }
    
    return {
      segment,
      multiplier,
      score: calculateDartScore(segment, multiplier),
      bed
    };
  }
  
  // Try to parse as a number (assume single)
  const num = parseInt(notation);
  if (!isNaN(num) && num >= 1 && num <= 20) {
    return {
      segment: num,
      multiplier: 1,
      score: num,
      bed: 'single'
    };
  }
  
  throw new Error(`Invalid dart notation: ${notation}`);
};

export const formatDartNotation = (dart: Dart): string => {
  if (dart.multiplier === 0) return 'M';
  if (dart.segment === 50) return 'Bull';
  if (dart.segment === 25) return 'OB';
  
  const prefix = dart.multiplier === 3 ? 'T' : dart.multiplier === 2 ? 'D' : 'S';
  return `${prefix}${dart.segment}`;
};

export const calculateThrowScore = (darts: Dart[]): number => {
  return darts.reduce((sum, dart) => sum + dart.score, 0);
};

export const calculateAverage = (throws: Throw[]): number => {
  if (throws.length === 0) return 0;
  
  const totalScore = throws.reduce((sum, t) => sum + t.score, 0);
  const totalDarts = throws.reduce((sum, t) => sum + t.darts.length, 0);
  
  if (totalDarts === 0) return 0;
  
  return Math.round((totalScore / totalDarts) * 3 * 100) / 100;
};

export const calculateFirst9Average = (throws: Throw[]): number => {
  let dartsCount = 0;
  let totalScore = 0;
  
  for (const throwData of throws) {
    for (const dart of throwData.darts) {
      if (dartsCount >= 9) break;
      totalScore += dart.score;
      dartsCount++;
    }
    if (dartsCount >= 9) break;
  }
  
  if (dartsCount === 0) return 0;
  
  return Math.round((totalScore / dartsCount) * 3 * 100) / 100;
};

export const isCheckout = (remaining: number, darts: Dart[]): boolean => {
  if (remaining !== calculateThrowScore(darts)) return false;
  
  const lastDart = darts[darts.length - 1];
  // Valid checkouts: any double (multiplier 2) including bull (segment 50, multiplier 2)
  return lastDart.multiplier === 2;
};

export const isBust = (
  remaining: number, 
  throwScore: number, 
  requiresDouble: boolean,
  lastDart?: Dart
): boolean => {
  const newRemaining = remaining - throwScore;
  
  // Score went negative
  if (newRemaining < 0) return true;
  
  // Finished on 0 but didn't hit a double when required
  if (newRemaining === 0 && requiresDouble && lastDart) {
    // Valid finish requires a double (multiplier 2), which includes bull
    return lastDart.multiplier !== 2;
  }
  
  // Left on 1 with double-out is impossible
  if (newRemaining === 1 && requiresDouble) return true;
  
  // Left on a bogey number (impossible checkout) with double-out
  if (requiresDouble && isBogeyNumber(newRemaining)) return true;
  
  return false;
};

export const calculateLegWinner = (leg: Leg, players: MatchPlayer[], startScore: number): string | null => {
  const playerScores: Record<string, number> = {};
  
  players.forEach(p => {
    playerScores[p.playerId] = startScore;
  });
  
  for (const throwData of leg.throws) {
    const score = calculateThrowScore(throwData.darts);
    playerScores[throwData.playerId] -= score;
    
    if (playerScores[throwData.playerId] === 0) {
      return throwData.playerId;
    }
  }
  
  return null;
};

export const calculateMatchStats = (match: Match): Record<string, any> => {
  const stats: Record<string, any> = {};
  
  match.players.forEach(player => {
    const playerThrows = match.legs.flatMap(leg => 
      leg.throws.filter(t => t.playerId === player.playerId)
    );
    
    stats[player.playerId] = {
      average: calculateAverage(playerThrows),
      first9Average: calculateFirst9Average(playerThrows),
      highestScore: Math.max(...playerThrows.map(t => t.score), 0),
      total180s: playerThrows.filter(t => t.score === 180).length,
      total171Plus: playerThrows.filter(t => t.score >= 171).length,
      total140Plus: playerThrows.filter(t => t.score >= 140).length,
      total100Plus: playerThrows.filter(t => t.score >= 100).length,
      total60Plus: playerThrows.filter(t => t.score >= 60).length,
      checkoutAttempts: playerThrows.filter(t => t.isCheckoutAttempt).length,
      checkoutsHit: match.legs.filter(leg => leg.winner === player.playerId).length,
    };
  });
  
  return stats;
};

export const getScoreCategory = (score: number): string | null => {
  if (score === 180) return '180';
  if (score >= 171) return '171+';
  if (score >= 140) return '140+';
  if (score >= 100) return '100+';
  if (score >= 60) return '60+';
  return null;
};

export const isNineDarter = (leg: Leg, startScore: number): boolean => {
  if (startScore !== 501) return false;
  
  const totalDarts = leg.throws.reduce((sum, t) => sum + t.darts.length, 0);
  return totalDarts === 9 && leg.winner !== undefined;
};

export const calculateDartsForLeg = (leg: Leg): number => {
  return leg.throws.reduce((sum, t) => sum + t.darts.length, 0);
};

export const getQuickScoreButtons = (): number[] => {
  return [180, 140, 100, 85, 81, 60, 45, 41, 26, 0];
};

export const validateScore = (score: number): boolean => {
  if (score < 0 || score > 180) return false;
  
  // Impossible scores
  const impossibleScores = [163, 166, 169, 172, 173, 175, 176, 178, 179];
  return !impossibleScores.includes(score);
};

export const convertScoreToDarts = (score: number): Dart[] => {
  // Convert a numeric score into plausible darts
  // This is a simplified approach - for common scores we use typical combinations
  
  if (score === 0) {
    return [{ segment: 0, multiplier: 0, score: 0, bed: 'miss' }];
  }
  
  if (score === 180) {
    return [
      { segment: 20, multiplier: 3, score: 60, bed: 'triple' },
      { segment: 20, multiplier: 3, score: 60, bed: 'triple' },
      { segment: 20, multiplier: 3, score: 60, bed: 'triple' },
    ];
  }
  
  if (score === 140) {
    return [
      { segment: 20, multiplier: 3, score: 60, bed: 'triple' },
      { segment: 20, multiplier: 3, score: 60, bed: 'triple' },
      { segment: 20, multiplier: 1, score: 20, bed: 'single' },
    ];
  }
  
  if (score === 100) {
    return [
      { segment: 20, multiplier: 3, score: 60, bed: 'triple' },
      { segment: 20, multiplier: 1, score: 20, bed: 'single' },
      { segment: 20, multiplier: 1, score: 20, bed: 'single' },
    ];
  }
  
  // For other scores, distribute across 3 darts using T20s and remaining score
  const darts: Dart[] = [];
  let remaining = score;
  
  // Try to use T20s (60) first
  while (remaining >= 60 && darts.length < 3) {
    darts.push({ segment: 20, multiplier: 3, score: 60, bed: 'triple' });
    remaining -= 60;
  }
  
  // If we still have score remaining and dart slots
  if (remaining > 0 && darts.length < 3) {
    // Try to use T19 (57) or T18 (54) if applicable
    if (remaining >= 57 && darts.length < 2) {
      darts.push({ segment: 19, multiplier: 3, score: 57, bed: 'triple' });
      remaining -= 57;
    } else if (remaining >= 54 && darts.length < 2) {
      darts.push({ segment: 18, multiplier: 3, score: 54, bed: 'triple' });
      remaining -= 54;
    } else if (remaining >= 51 && darts.length < 2) {
      darts.push({ segment: 17, multiplier: 3, score: 51, bed: 'triple' });
      remaining -= 51;
    } else if (remaining > 20) {
      // Use a single with remaining score capped at 20
      const dartScore = Math.min(remaining, 20);
      darts.push({ segment: dartScore, multiplier: 1, score: dartScore, bed: 'single' });
      remaining -= dartScore;
    } else if (remaining > 0) {
      darts.push({ segment: remaining, multiplier: 1, score: remaining, bed: 'single' });
      remaining = 0;
    }
  }
  
  // Fill remaining slots with the last bit of score
  while (remaining > 0 && darts.length < 3) {
    const dartScore = Math.min(remaining, 60);
    if (dartScore > 20) {
      const segment = Math.floor(dartScore / 3);
      if (segment <= 20) {
        darts.push({ segment, multiplier: 3, score: segment * 3, bed: 'triple' });
        remaining -= segment * 3;
      } else {
        darts.push({ segment: 20, multiplier: 1, score: 20, bed: 'single' });
        remaining -= 20;
      }
    } else {
      darts.push({ segment: dartScore, multiplier: 1, score: dartScore, bed: 'single' });
      remaining = 0;
    }
  }
  
  // Ensure we always return at least one dart
  if (darts.length === 0) {
    darts.push({ segment: 0, multiplier: 0, score: 0, bed: 'miss' });
  }
  
  return darts;
};

export const getBogeyNumbers = (): number[] => {
  return [169, 168, 166, 165, 163, 162, 159];
};

export const isBogeyNumber = (score: number): boolean => {
  const bogeyNumbers = [169, 168, 166, 165, 163, 162, 159];
  return bogeyNumbers.includes(score);
};