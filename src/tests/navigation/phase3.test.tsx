import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { showsAppNavigation } from '../../components/navigation/navVisibility';
import SegmentedButton from '../../components/common/SegmentedButton';
import ScoreStrip from '../../components/game/ScoreStrip';
import { onboardingState } from '../../components/onboarding/onboardingState';

describe('showsAppNavigation', () => {
  it('shows on app screens when signed in', () => {
    for (const p of ['/', '/stats', '/players', '/achievements', '/settings']) expect(showsAppNavigation(p, true)).toBe(true);
  });
  it('never on game screens, public pages, or signed out', () => {
    for (const p of ['/game', '/cricket', '/training/doubles', '/login', '/impressum', '/willkommen', '/pricing']) {
      expect(showsAppNavigation(p, true)).toBe(false);
    }
    expect(showsAppNavigation('/', false)).toBe(false);
  });
});

describe('SegmentedButton', () => {
  it('is a radio group that reports the chosen option and places the pill', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegmentedButton label="Mode" value="b" onChange={onChange}
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }]} />,
    );
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'C' }));
    expect(onChange).toHaveBeenCalledWith('c');
    const group = container.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group.style.getPropertyValue('--m3-seg-count')).toBe('3');
    expect(group.style.getPropertyValue('--m3-seg-index')).toBe('1');
  });
});

describe('ScoreStrip', () => {
  it('shows every player and marks whose turn it is', () => {
    render(<ScoreStrip showSets={false} players={[
      { playerId: 'a', name: 'Alice', remaining: 441, legsWon: 1, setsWon: 0, isActive: false },
      { playerId: 'b', name: 'Bob', remaining: 501, legsWon: 0, setsWon: 0, isActive: true },
    ]} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveAttribute('aria-current', 'true');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[0]).toHaveTextContent('Alice');
  });
});

describe('onboardingState', () => {
  it('a new account has nothing done', () => {
    expect(onboardingState([], false)).toEqual({ hasOwnPlayer: false, hasOpponent: false, hasFinishedMatch: false });
  });
  it('guests and bots are not "your own player", but count as opponents', () => {
    const s = onboardingState([{ name: 'Guest' }, { name: 'Robo', isBot: true }], false);
    expect(s.hasOwnPlayer).toBe(false);
    expect(s.hasOpponent).toBe(true);
  });
  it('is complete with a person, an opponent and a finished match', () => {
    expect(onboardingState([{ name: 'Martin' }, { name: 'Robo', isBot: true }], true))
      .toEqual({ hasOwnPlayer: true, hasOpponent: true, hasFinishedMatch: true });
  });
});
