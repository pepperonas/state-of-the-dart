import { v4 as uuidv4 } from 'uuid';
import { TournamentMatch, TournamentParticipant } from '../types/index';

export const BYE = 'BYE';

const nextPowerOfTwo = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

/**
 * Single-elimination bracket for any field size.
 *
 * The field is padded to the next power of two with byes; a bye is decided at
 * once and its player advances. Every later match is fed by exactly two
 * matches of the round before: match i of round r feeds match ⌊i/2⌋ of round
 * r+1. The old generator appended an extra "final" after the real one — a
 * match only ever reached by one player, so the tournament ended without a
 * champion.
 */
export const buildKnockoutBracket = (participantIds: string[]): TournamentMatch[] => {
  const size = nextPowerOfTwo(participantIds.length);
  const rounds = Math.log2(size);
  const byes = size - participantIds.length;

  // The first `byes` players get a bye; everyone else is paired up. Padding the
  // field at the end instead would pair two byes against each other.
  let matches: TournamentMatch[] = [];
  let next = 0;
  for (let slot = 0; slot < size / 2; slot++) {
    const p1 = participantIds[next++];
    const p2 = slot < byes ? BYE : participantIds[next++];
    matches.push({ id: uuidv4(), round: 1, participant1Id: p1, participant2Id: p2 });
  }
  for (let round = 2, count = size / 4; round <= rounds; round++, count /= 2) {
    for (let i = 0; i < count; i++) {
      matches.push({ id: uuidv4(), round, participant1Id: '', participant2Id: '' });
    }
  }

  // Decide the byes.
  for (const m of matches.filter(x => x.round === 1 && x.participant2Id === BYE)) {
    matches = advanceWinner(matches, m.id, m.participant1Id);
  }
  return matches;
};

/** Returns new matches with the winner recorded and moved into its next-round slot. */
export const advanceWinner = (matches: TournamentMatch[], matchId: string, winnerId: string): TournamentMatch[] => {
  const match = matches.find(m => m.id === matchId);
  if (!match) return matches;
  const sameRound = matches.filter(m => m.round === match.round);
  const index = sameRound.findIndex(m => m.id === matchId);
  const target = matches.filter(m => m.round === match.round + 1)[Math.floor(index / 2)];
  const slot = index % 2 === 0 ? 'participant1Id' : 'participant2Id';

  return matches.map(m => {
    if (m.id === matchId) return { ...m, winner: winnerId, completed: new Date() };
    if (target && m.id === target.id) return { ...m, [slot]: winnerId };
    return m;
  });
};

/** A match both players are known for and nobody has won yet. */
export const isPlayable = (m: TournamentMatch) =>
  !m.winner && !!m.participant1Id && !!m.participant2Id && m.participant1Id !== BYE && m.participant2Id !== BYE;

/** Winner of the last round — the final. */
export const knockoutChampion = (matches: TournamentMatch[]): string | undefined => {
  if (matches.length === 0) return undefined;
  const lastRound = Math.max(...matches.map(m => m.round));
  return matches.find(m => m.round === lastRound)?.winner;
};

/** Most wins, then leg difference. */
export const roundRobinChampion = (participants: TournamentParticipant[]): string | undefined =>
  [...participants].sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : (b.legsFor - b.legsAgainst) - (a.legsFor - a.legsAgainst),
  )[0]?.id;

/** Records a finished match in both participants' tables — legs from each one's own side. */
export const recordResult = (
  participants: TournamentParticipant[],
  winnerId: string,
  loserId: string,
  winnerLegs: number,
  loserLegs: number,
): TournamentParticipant[] =>
  participants.map(p => {
    if (p.id === winnerId) return { ...p, wins: p.wins + 1, legsFor: p.legsFor + winnerLegs, legsAgainst: p.legsAgainst + loserLegs };
    if (p.id === loserId) return { ...p, losses: p.losses + 1, legsFor: p.legsFor + loserLegs, legsAgainst: p.legsAgainst + winnerLegs };
    return p;
  });
