import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import '../../i18n/config';
import { lastTileSpan } from '../../utils/tileSpan';
import { DetailStat, WinRing, HeroStat } from '../../components/stats/StatsOverview';

/** 0.38.0 — home tiles and the statistics overview. */
const MENU = fs.readFileSync(path.resolve(__dirname, '../../components/MainMenu.tsx'), 'utf8');
const tile = (key: string) => {
  const line = MENU.split('\n').find(l => l.includes(`t('menu.${key}')`) && l.includes('icon:'))!;
  return { icon: line.match(/icon: ('?[\w]+'?)/)![1], tone: line.match(/tone: '(\w+)'/)![1] };
};

describe('home tiles', () => {
  it('every game mode has its own glyph (four shared the target)', () => {
    const icons = ['cricket', 'around_the_clock', 'shanghai', 'online_multiplayer', 'training', 'tournaments'].map(k => tile(k).icon);
    expect(new Set(icons).size).toBe(icons.length);
    expect(icons).not.toContain('Target');
  });

  it('one tone per kind: play primary, practice secondary, review tertiary', () => {
    for (const k of ['cricket', 'around_the_clock', 'shanghai', 'tournaments', 'online_multiplayer']) expect(tile(k).tone, k).toBe('primary');
    expect(tile('training').tone).toBe('secondary');
    for (const k of ['dashboard', 'match_history', 'leaderboard', 'global_leaderboard', 'achievements']) expect(tile(k).tone, k).toBe('tertiary');
  });

  it('the last tile fills the rest of its row on 2 and 3 columns', () => {
    expect(lastTileSpan(6)).toBe('');
    expect(lastTileSpan(5)).toBe('sm:col-span-2 lg:col-span-2');
    expect(lastTileSpan(4)).toBe('lg:col-span-3');
    expect(lastTileSpan(3)).toBe('sm:col-span-2 lg:col-span-1');
    expect(lastTileSpan(1)).toBe('');
  });
});

describe('statistics tiles', () => {
  it('a zero is quiet, "never yet" is a dash, a real value is emphasised', () => {
    const { rerender } = render(<DetailStat label="180s" value={0} />);
    expect(screen.getByText('0').closest('[data-quiet]')).toBeTruthy();
    rerender(<DetailStat label="Höchster Checkout" value={null} />);
    expect(screen.getByText('—')).toHaveClass('text-on-surface-variant');
    rerender(<DetailStat label="140+" value={2} />);
    expect(screen.getByText('2')).toHaveClass('text-on-surface');
    expect(screen.getByText('2').closest('[data-quiet]')).toBeNull();
  });

  it('the win ring draws the share of games won', () => {
    const { container } = render(<WinRing share={0.25} />);
    const arc = container.querySelectorAll('circle')[1];
    const [on, total] = arc.getAttribute('stroke-dasharray')!.split(' ').map(Number);
    expect(on / total).toBeCloseTo(0.25, 3);
  });

  it('a headline figure without a sub line still reserves it — the three share a baseline', () => {
    const { container: a } = render(<HeroStat label="Spiele" value="12" />);
    const { container: b } = render(<HeroStat label="Siegquote" value="50%" sub="1 von 2 gewonnen" />);
    const lines = (c: HTMLElement) => c.querySelector('.min-w-0')!.children.length;
    expect(lines(a)).toBe(lines(b));
  });

  it('a headline figure never dims its label with opacity', () => {
    const { container } = render(<HeroStat label="Spiele" value="12" sub="x" />);
    expect(container.innerHTML).not.toMatch(/opacity-/);
  });
});
