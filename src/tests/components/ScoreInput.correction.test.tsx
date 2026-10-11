import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '../../i18n/config';
import ScoreInput from '../../components/game/ScoreInput';
import type { Dart } from '../../types/index';
import { calculateThrowScore } from '../../utils/scoring';

/**
 * 0.32.0 — a typed visit that is taken back comes back as a sum to correct
 * ("60 → _"), and after a typed visit a chip row offers how it was thrown.
 */
const guess = (segment: number, multiplier: 1 | 2 | 3): Dart =>
  ({ segment, multiplier, score: segment * multiplier, estimated: true } as Dart);

const setup = (overrides: Partial<React.ComponentProps<typeof ScoreInput>> = {}) => {
  const props = {
    currentThrow: [] as Dart[],
    onAddDart: vi.fn(),
    onRemoveDart: vi.fn(),
    onClearThrow: vi.fn(),
    onConfirm: vi.fn(),
    editingDartIndex: null,
    onSetEditingDartIndex: vi.fn(),
    remaining: 441,
    ...overrides,
    onReplaceVisit: vi.fn<[Dart[]], void>(),
  };
  render(<ScoreInput {...props} />);
  return props;
};

describe('ScoreInput — correcting a typed visit as a sum', () => {
  const taken = { currentThrow: [guess(20, 3)], isEditingThrow: true, remaining: 441 }; // 501 − 60

  it('shows "60 → …" instead of the invented darts', () => {
    setup(taken);
    expect(screen.getByTestId('visit-correction')).toHaveTextContent('60 → …');
    expect(screen.getByTestId('correction-hint')).toHaveTextContent('60');
  });

  it('a typed total + Enter replaces the visit, counted from before it', async () => {
    const props = setup(taken);
    await userEvent.keyboard('45{Enter}');
    expect(props.onReplaceVisit).toHaveBeenCalledTimes(1);
    expect(calculateThrowScore(props.onReplaceVisit.mock.calls[0][0])).toBe(45);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('a checkout total follows the checkout route of the score before the visit', async () => {
    const props = setup({ currentThrow: [guess(20, 1)], isEditingThrow: true, remaining: 20, outRule: 'double' }); // 40 left before
    await userEvent.keyboard('40{Enter}');
    const darts = props.onReplaceVisit.mock.calls[0][0] as Dart[];
    expect(calculateThrowScore(darts)).toBe(40);
    expect(darts[darts.length - 1].multiplier).toBe(2);
  });

  it('Esc and an empty Enter keep the visit as it was', async () => {
    const props = setup(taken);
    await userEvent.keyboard('{Escape}');
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onClearThrow).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(props.onConfirm).toHaveBeenCalledTimes(2);
    expect(props.onReplaceVisit).not.toHaveBeenCalled();
  });

  it('exact darts taken back stay darts (no correction line)', () => {
    setup({ currentThrow: [{ segment: 20, multiplier: 3, score: 60 } as Dart], isEditingThrow: true });
    expect(screen.queryByTestId('visit-correction')).toBeNull();
  });
});

describe('ScoreInput — "how was it thrown?" chips', () => {
  const S20 = { segment: 20, multiplier: 1, score: 20 } as Dart;
  const T20 = { segment: 20, multiplier: 3, score: 60 } as Dart;
  const MISS = { segment: 0, multiplier: 0, score: 0 } as Dart;

  it('shows the options and picks one with a tap', async () => {
    const onPick = vi.fn();
    const onOther = vi.fn();
    setup({ chips: { visitId: 'v1', playerName: 'Anna', score: 60, options: [[S20, S20, S20], [T20, MISS, MISS]], onPick, onOther } });
    expect(screen.getByTestId('visit-chips')).toHaveTextContent('Anna 60');
    await userEvent.click(screen.getByRole('button', { name: /20 · 20 · 20/ }));
    expect(onPick).toHaveBeenCalledWith([S20, S20, S20]);
    await userEvent.click(screen.getByTestId('visit-chip-other'));
    expect(onOther).toHaveBeenCalled();
  });

  it('never takes Enter away from the numpad', async () => {
    const onPick = vi.fn();
    const props = setup({ onCommitDarts: vi.fn(), chips: { visitId: 'v1', playerName: 'Anna', score: 60, options: [[S20, S20, S20]], onPick, onOther: vi.fn() } });
    await userEvent.click(screen.getByRole('button', { name: /20 · 20 · 20/ }));
    await userEvent.keyboard('26{Enter}');
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(props.onCommitDarts).toHaveBeenCalledTimes(1);
  });
});
