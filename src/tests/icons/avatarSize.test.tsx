import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';

import '../../i18n/config';
import PlayerAvatar from '../../components/player/PlayerAvatar';
import { GLYPH_FILL, glyphFill, avatarGlyphSize } from '../../components/icons';

/**
 * 0.35.1 — player icons drawn larger. The glyph is a fraction of its disc
 * (it was fixed pixels at ~55 %, and only 41 % of the 128 px desktop xl disc),
 * every disc grew one step, and `xs` keeps the old 32 px for tight rows.
 */
const disc = (el: HTMLElement) => el.querySelector('.rounded-full') as HTMLElement;
const glyph = (el: HTMLElement) => el.querySelector('svg') as SVGElement;

describe('avatar glyph fill', () => {
  it('a glyph fills about two thirds of its disc, per kind', () => {
    expect(glyphFill('gi:wolf-head')).toBe(GLYPH_FILL.game);
    expect(glyphFill('em:🦊')).toBe(GLYPH_FILL.emoji);
    expect(glyphFill('trophy')).toBe(GLYPH_FILL.app);
    expect(glyphFill('🎯')).toBe(GLYPH_FILL.app);
    for (const f of Object.values(GLYPH_FILL)) {
      expect(f).toBeGreaterThanOrEqual(0.6);
      expect(f).toBeLessThanOrEqual(0.72); // more and the glyph touches the rim
    }
  });

  it('the glyph is sized relative to the disc at every size, the xl one included', () => {
    for (const size of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
      const { container, unmount } = render(<PlayerAvatar avatar="gi:wolf-head" name="Wolf" size={size} />);
      expect(glyph(container).getAttribute('width'), size).toBe(avatarGlyphSize('gi:wolf-head'));
      expect(glyph(container).getAttribute('width'), size).toMatch(/%$/);
      unmount();
    }
  });

  it('discs grew one step, xs is the old 32 px', () => {
    const cls = (size: 'xs' | 'sm' | 'md' | 'lg') =>
      disc(render(<PlayerAvatar avatar="trophy" name="X" size={size} />).container).className;
    expect(cls('xs')).toContain('w-8 h-8');
    expect(cls('sm')).toContain('w-10 h-10');
    expect(cls('md')).toContain('w-14 h-14');
    expect(cls('lg')).toContain('w-[4.5rem] h-[4.5rem]');
  });

  it('an initial grows with its disc', () => {
    const { container: a } = render(<PlayerAvatar name="Anna" size="xs" />);
    const { container: b } = render(<PlayerAvatar name="Anna" size="xl" />);
    expect(a.querySelector('span')?.className).toContain('m3-title-small');
    expect(b.querySelector('span')?.className).toContain('m3-headline-large');
  });

  it('the heatmap player chip keeps the small disc (its row would grow to 56 px)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../components/game/GameScreen.tsx'), 'utf8');
    const at = src.indexOf('onClick={() => setSelectedHeatmapPlayer(');
    const chip = src.slice(at, at + 1200);
    expect(chip.match(/<PlayerAvatar[\s\S]*?size="(\w+)"/)?.[1]).toBe('xs');
  });

  it('no hand-made avatar disc keeps a fixed pixel glyph', () => {
    // These drew their own disc with a glyph at 33–46 % of it.
    const root = path.resolve(__dirname, '../../components');
    for (const f of ['leaderboard/Leaderboard.tsx', 'training/TrainingScreen.tsx', 'TenantSelector.tsx', 'Settings.tsx']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      expect(src, f).not.toMatch(/<AvatarGlyph avatar=\{(player|tenant|currentTenant\?)\.avatar\} size=\{\d+\}/);
    }
  });
});
