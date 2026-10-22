import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HANDOVER, GAME_TALLY, TALLY, settleTime, springPosition } from '../../utils/springs';
import { HOLD_MS } from '../../hooks/useHandover';
import { FLAMES_AFTER_MS, LETTER_STAGGER_S } from '../../components/game/spotlightMotion';
import { HERO_MOMENT_MS } from '../../components/game/HeroMoment';

/**
 * 0.44.0 — the in-game motion was too quick to be noticed. These pin the
 * slower timing so a later "snappier" tweak has to be deliberate.
 */
describe('in-game motion is slow enough to be seen', () => {
  it('the thrower holds the hero card for about a second', () => {
    expect(HOLD_MS).toBeGreaterThanOrEqual(900);
  });

  it('the hand-over spring takes over a second and overshoots visibly', () => {
    expect(settleTime(HANDOVER)).toBeGreaterThan(1.2);
    let peak = 0;
    for (let t = 0; t < 3; t += 0.005) peak = Math.max(peak, springPosition(HANDOVER, t));
    expect(peak).toBeGreaterThan(1.02);
  });

  it('the in-game count-down is slower than the default tally and never overshoots', () => {
    expect(settleTime(GAME_TALLY)).toBeGreaterThan(settleTime(TALLY) * 1.8);
    expect(GAME_TALLY.dampingRatio).toBeGreaterThanOrEqual(1);
  });

  it('the flames wait for the slower card, the name builds up letter by letter', () => {
    expect(FLAMES_AFTER_MS).toBeGreaterThanOrEqual(HOLD_MS + 600);
    expect(LETTER_STAGGER_S).toBeGreaterThanOrEqual(0.05);
  });

  it('a 180 holds the screen for a real beat', () => {
    expect(HERO_MOMENT_MS).toBeGreaterThanOrEqual(2500);
  });

  it('the remaining score on hero card and rows counts with the game tally', () => {
    for (const file of ['HeroCard', 'PlayerRow']) {
      const src = readFileSync(`src/components/game/${file}.tsx`, 'utf8');
      expect(src, file).toMatch(/<AnimatedNumber[^>]*numeral[^>]*tally=\{GAME_TALLY\}[^>]*value=\{remaining\}/s);
    }
  });
});
