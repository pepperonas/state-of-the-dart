import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import '../../i18n/config';
import ScoreInput from '../../components/game/ScoreInput';
import ScoreDelta from '../../components/game/ScoreDelta';
import type { Dart } from '../../types/index';

/** Motion on the game screen (0.26.0) — the parts a unit test can see. */
const T20: Dart = { segment: 20, multiplier: 3, score: 60 } as Dart;

const setup = (over: Partial<React.ComponentProps<typeof ScoreInput>> = {}) =>
  render(
    <ScoreInput
      currentThrow={[]}
      onAddDart={vi.fn()}
      onRemoveDart={vi.fn()}
      onClearThrow={vi.fn()}
      onConfirm={vi.fn()}
      editingDartIndex={null}
      onSetEditingDartIndex={vi.fn()}
      remaining={501}
      {...over}
    />,
  );

beforeEach(() => localStorage.clear());

describe('ScoreInput motion', () => {
  it('a bust takes over the total box and marks the slot row', () => {
    setup({ currentThrow: [T20, T20], bust: true });
    expect(screen.getByTestId('bust-chip')).toHaveTextContent(/bust/i);
    expect(screen.getByTestId('dart-slots')).toHaveAttribute('data-bust', 'true');
  });

  it('no bust, no chip', () => {
    setup({ currentThrow: [T20] });
    expect(screen.queryByTestId('bust-chip')).toBeNull();
    expect(screen.getByTestId('dart-slots')).not.toHaveAttribute('data-bust');
  });

  it('no remaining score and no empty checkout row inside the input (both live on the hero card)', () => {
    setup();
    expect(screen.queryByText('Rest')).toBeNull();
    expect(screen.queryByTestId('checkout-slot')).toBeNull();
    expect(screen.queryByTestId('visit-preview')).toBeNull();
  });

  it('a bust previews the score it keeps', () => {
    setup({ currentThrow: [T20, T20], bust: true, previewRemaining: 101 });
    expect(screen.getByTestId('visit-preview')).toHaveTextContent('→ 101');
  });

  it('every input key carries the spring shape morph, state layer and ripple', () => {
    setup();
    const keys = [
      screen.getByRole('button', { name: '7' }),
      screen.getByRole('button', { name: '0' }),
      screen.getByRole('button', { name: 'Eingabe löschen' }),
    ];
    for (const key of keys) {
      expect(key.className).toMatch(/sotd-key/);
      expect(key.className).toMatch(/m3-state-layer/);
      expect(key.className).toMatch(/m3-ripple/);
    }
  });
});

describe('ScoreDelta', () => {
  it('shows the drop when a score goes down by a visit', () => {
    const { rerender } = render(<ScoreDelta value={501} />);
    expect(screen.queryByTestId('score-delta')).toBeNull();
    act(() => rerender(<ScoreDelta value={441} />));
    expect(screen.getByTestId('score-delta')).toHaveTextContent('−60');
  });

  it('shows nothing when the score goes up (undo, new leg) or drops implausibly', () => {
    const { rerender } = render(<ScoreDelta value={441} />);
    act(() => rerender(<ScoreDelta value={501} />));
    expect(screen.queryByTestId('score-delta')).toBeNull();
    act(() => rerender(<ScoreDelta value={200} />));
    expect(screen.queryByTestId('score-delta')).toBeNull();
  });
});
