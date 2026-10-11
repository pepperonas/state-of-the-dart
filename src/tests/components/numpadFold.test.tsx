import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import '../../i18n/config';
import ScoreInput from '../../components/game/ScoreInput';
import HeroCard from '../../components/game/HeroCard';
import ScoreStrip from '../../components/game/ScoreStrip';
import type { Dart, MatchPlayer } from '../../types/index';

vi.mock('../../context/PlayerContext', () => ({ usePlayer: () => ({ players: [] }) }));

/** jsdom has no matchMedia: answer every query with `matches`. */
const mockMedia = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

const input = (onCommitDarts = vi.fn()) => {
  render(
    <ScoreInput currentThrow={[] as Dart[]} onAddDart={vi.fn()} onRemoveDart={vi.fn()} onClearThrow={vi.fn()}
      onConfirm={vi.fn()} onCommitDarts={onCommitDarts} editingDartIndex={null}
      onSetEditingDartIndex={vi.fn()} remaining={501} />,
  );
  return onCommitDarts;
};

beforeEach(() => localStorage.clear());
afterEach(() => { delete (window as { matchMedia?: unknown }).matchMedia; });

describe('numpad on a keyboard-first desktop', () => {
  it('starts folded, and the keyboard still books a visit', () => {
    mockMedia(true);
    const commit = input();
    expect(screen.getByTestId('numpad-collapsed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '7' })).toBeNull();
    for (const k of ['4', '5', 'Enter']) act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k })); });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('unfolds on request and remembers it', () => {
    mockMedia(true);
    input();
    fireEvent.click(screen.getByRole('button', { name: 'Ziffernfeld einblenden' }));
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
    expect(localStorage.getItem('sotd-numpad-open')).toBe('1');
  });

  it('touch devices keep it open, without a fold control', () => {
    mockMedia(false);
    input();
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ziffernfeld/ })).toBeNull();
  });
});

describe('legs to win', () => {
  const player = {
    playerId: 'p', name: 'Anna', legsWon: 1, setsWon: 0, matchAverage: 0,
    match180s: 0, match140Plus: 0, match100Plus: 0, matchHighestScore: 0,
  } as unknown as MatchPlayer;

  it('the card says how far from the win, small', () => {
    render(<HeroCard player={player} remaining={301} rank={null} average={0} legsWon={1} setsWon={0} legsToWin={2} dartsInLeg={0} visits={[]} />);
    const line = screen.getByTestId('legs-to-win');
    expect(line).toHaveTextContent('1/2 zum Sieg');
    expect(line.className).toContain('m3-label-small');
  });

  it('in a sets match it counts towards the set', () => {
    render(<HeroCard player={player} remaining={301} rank={null} average={0} legsWon={1} setsWon={0} legsToWin={3} showSets dartsInLeg={0} visits={[]} />);
    expect(screen.getByTestId('legs-to-win')).toHaveTextContent('1/3 zum Satz');
  });

  it('the phone strip shows won/needed and reads it as a sentence', () => {
    render(<ScoreStrip showSets={false} legsToWin={3}
      players={[{ playerId: 'p', name: 'Anna', remaining: 301, legsWon: 1, setsWon: 0, isActive: true }]} />);
    expect(screen.getByTestId('strip-Anna')).toHaveTextContent('1/3L');
    expect(screen.getByTestId('strip-Anna')).toHaveTextContent('1 von 3 Legs zum Sieg');
  });
});
