import { describe, it, expect } from 'vitest';
import { legLeaderId } from '../../utils/legLeader';

const visit = (playerId: string, score: number, isBust = false) => ({ playerId, score, isBust });

describe('legLeaderId', () => {
  const ids = ['a', 'b', 'c'];
  it('is nobody at the start of a leg', () => {
    expect(legLeaderId(ids, [], 501)).toBeNull();
  });
  it('is the player with the lowest remaining score', () => {
    expect(legLeaderId(ids, [visit('a', 60), visit('b', 100), visit('c', 45)], 501)).toBe('b');
  });
  it('is nobody when the lowest score is shared', () => {
    expect(legLeaderId(ids, [visit('a', 60), visit('b', 60)], 501)).toBeNull();
  });
  it('ignores busts (they score nothing)', () => {
    expect(legLeaderId(ids, [visit('a', 60), visit('b', 100, true)], 501)).toBe('a');
  });
  it('ignores visits of players no longer in the match', () => {
    expect(legLeaderId(['a', 'b'], [visit('a', 20), visit('x', 180)], 501)).toBe('a');
  });
});
