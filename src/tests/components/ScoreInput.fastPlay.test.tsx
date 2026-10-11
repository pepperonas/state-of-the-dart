import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import '../../i18n/config';
import ScoreInput from '../../components/game/ScoreInput';
import type { Dart } from '../../types/index';

/**
 * Quick play in the score input (0.25.0): a typed total commits in one step,
 * the labelled button takes it too, and a confirmed visit can wait for an
 * explicit "next player".
 */
const setup = (overrides: Partial<React.ComponentProps<typeof ScoreInput>> = {}) => {
  const props = {
    currentThrow: [] as Dart[],
    onAddDart: vi.fn(),
    onRemoveDart: vi.fn(),
    onClearThrow: vi.fn(),
    onConfirm: vi.fn(),
    onCommitDarts: vi.fn(),
    editingDartIndex: null,
    onSetEditingDartIndex: vi.fn(),
    remaining: 501,
    ...overrides,
  };
  const view = render(<ScoreInput {...props} />);
  return { props, view };
};

const press = (key: string) =>
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });

const sum = (darts: Dart[]) => darts.reduce((n, d) => n + d.score, 0);

beforeEach(() => localStorage.clear());

describe('ScoreInput quick play', () => {
  it('a typed total and Enter commit in one call, with all its darts', () => {
    const { props } = setup();
    press('4'); press('5'); press('Enter');
    expect(props.onCommitDarts).toHaveBeenCalledTimes(1);
    expect(sum(vi.mocked(props.onCommitDarts!).mock.calls[0][0])).toBe(45);
    // No separate add + delayed confirm any more.
    expect(props.onAddDart).not.toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('keys typed straight after a commit are kept (they used to be dropped)', () => {
    const { props } = setup();
    press('6'); press('0'); press('Enter');
    press('4'); press('5'); press('Enter');
    expect(props.onCommitDarts).toHaveBeenCalledTimes(2);
    expect(sum(vi.mocked(props.onCommitDarts!).mock.calls[1][0])).toBe(45);
  });

  it('the typed total sits next to the slots', () => {
    setup();
    press('1'); press('0'); press('0');
    expect(screen.getByTestId('visit-total')).toHaveTextContent('100');
  });

  it('"Bestätigen" takes a typed total like Enter does', () => {
    const { props } = setup();
    press('2'); press('6');
    const confirm = screen.getByRole('button', { name: /Bestätigen/ });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(sum(vi.mocked(props.onCommitDarts!).mock.calls[0][0])).toBe(26);
  });

  it('"Bestätigen" stays disabled with nothing typed and no darts', () => {
    setup();
    expect(screen.getByRole('button', { name: /Bestätigen/ })).toBeDisabled();
  });

  it('shows what the visit leaves under the total', () => {
    setup({ currentThrow: [{ segment: 20, multiplier: 3, score: 60 } as Dart], previewRemaining: 441 });
    expect(screen.getByTestId('visit-preview')).toHaveTextContent('→ 441');
  });

  it('waiting for the next player: Enter passes the turn and digits do nothing', () => {
    const onNextPlayer = vi.fn();
    const { props } = setup({ awaitingNextPlayer: 'Ben', onNextPlayer });
    press('6'); press('0');
    // Tapping the numpad is locked too, not only the keyboard.
    fireEvent.click(screen.getByRole('button', { name: '6' }));
    expect(screen.getByTestId('visit-total')).not.toHaveTextContent('6');
    press('Enter');
    expect(onNextPlayer).toHaveBeenCalledTimes(1);
    expect(props.onCommitDarts).not.toHaveBeenCalled();
    const next = screen.getByRole('button', { name: /Ben/ });
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    expect(onNextPlayer).toHaveBeenCalledTimes(2);
  });

  it('shows the visit just handed over', () => {
    setup({ handoff: { key: 1, name: 'Ann', score: 60, remaining: 441, bust: false } });
    expect(screen.getByTestId('handoff-chip')).toHaveTextContent('Ann · 60 → 441');
  });

  it('numpad keys do not take focus, so a later Enter commits', () => {
    setup();
    const seven = screen.getByRole('button', { name: '7' });
    // jsdom has no PointerEvent; React listens to the event name either way.
    const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    seven.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });
});
