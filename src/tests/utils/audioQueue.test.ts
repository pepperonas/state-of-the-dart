import { describe, it, expect } from 'vitest';
import { pruneForAnnouncement } from '../../utils/audio';

describe('pruneForAnnouncement', () => {
  it('drops calls and pops that are still waiting when a new score is called', () => {
    const queue = [
      '/sounds/OMNI/pop.mp3',
      '/sounds/caller/60.mp3',
      '/sounds/yourequire/141.mp3',
      '/sounds/requires/40.mp3',
    ];
    expect(pruneForAnnouncement(queue)).toEqual([]);
  });

  it('keeps everything else (leg and match calls, achievement sounds)', () => {
    const queue = ['/sounds/gameshot/legs/2.mp3', '/sounds/texts/gameshotandthematch.mp3'];
    expect(pruneForAnnouncement(queue)).toEqual(queue);
  });
});
