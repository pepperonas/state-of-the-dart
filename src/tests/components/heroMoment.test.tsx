import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '../../i18n/config';
import HeroMoment, { HERO_MOMENT_MS } from '../../components/game/HeroMoment';
import AnimatedNumber from '../../components/common/AnimatedNumber';

describe('HeroMoment', () => {
  it('celebrates the number, never blocks input, and clears itself', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<HeroMoment moment={{ key: 1, value: 180, kind: '180', name: 'Ann', bests: [] }} onDone={onDone} />);
    const layer = screen.getByTestId('hero-moment');
    expect(layer).toHaveTextContent('180');
    expect(layer.className).toContain('pointer-events-none');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    act(() => { vi.advanceTimersByTime(HERO_MOMENT_MS); });
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('names a new personal best', () => {
    render(<HeroMoment moment={{ key: 2, value: 171, kind: '180', name: 'Ann', bests: [{ kind: 'visit', value: 171 }] }} onDone={() => {}} />);
    expect(screen.getByTestId('pb-chip')).toHaveTextContent('Neuer Rekord: 171');
  });

  it('nothing to show, nothing rendered', () => {
    render(<HeroMoment moment={null} onDone={() => {}} />);
    expect(screen.queryByTestId('hero-moment')).toBeNull();
  });
});

describe('AnimatedNumber numerals', () => {
  it('sets big scores in the numeral face', () => {
    const { container } = render(<AnimatedNumber value={501} numeral />);
    expect(container.firstElementChild?.className).toContain('sotd-numeral');
  });
});
