import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '../../i18n/config';
import EditVisitDialog from '../../components/game/EditVisitDialog';
import type { Dart } from '../../types';
import { calculateThrowScore } from '../../utils/scoring';

/** 0.32.0 — correcting a booked visit by total or by darts. */
const T20 = { segment: 20, multiplier: 3, score: 60, estimated: true } as Dart;

type Save = (darts: Dart[]) => string | null;
const setup = (onSave = vi.fn<Parameters<Save>, ReturnType<Save>>(() => null), tab: 'sum' | 'darts' = 'sum') => {
  const onClose = vi.fn();
  render(
    <EditVisitDialog open onClose={onClose} playerName="Anna" visitNumber={4} score={60} darts={[T20]}
      remainingBefore={301} outRule="double" initialTab={tab} onSave={onSave} />,
  );
  return { onSave, onClose };
};

describe('EditVisitDialog', () => {
  it('saves a typed total and closes', async () => {
    const { onSave, onClose } = setup();
    expect(screen.getByRole('dialog')).toHaveTextContent('Anna');
    await userEvent.type(screen.getByTestId('edit-visit-sum'), '45{Enter}');
    expect(calculateThrowScore(onSave.mock.calls[0][0])).toBe(45);
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses an impossible total without calling save', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByTestId('edit-visit-sum'), '179');
    await userEvent.click(screen.getByTestId('edit-visit-save'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(/nicht möglich/);
  });

  it('picks exact darts on the grid', async () => {
    const { onSave } = setup(undefined, 'darts');
    await userEvent.click(screen.getByRole('button', { name: 'Single 20' }));
    await userEvent.click(screen.getByRole('radio', { name: /triple/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Triple 5' }));
    await userEvent.click(screen.getByTestId('edit-visit-save'));
    expect(onSave).toHaveBeenCalledWith([
      { segment: 20, multiplier: 1, score: 20, bed: 'single' },
      { segment: 5, multiplier: 3, score: 15, bed: 'triple' },
    ]);
  });

  it('shows the reason when the game refuses the correction and stays open', async () => {
    const { onClose } = setup(vi.fn<Parameters<Save>, ReturnType<Save>>(() => 'Damit wäre das Leg beendet.'));
    await userEvent.type(screen.getByTestId('edit-visit-sum'), '40{Enter}');
    expect(screen.getByRole('dialog')).toHaveTextContent('Damit wäre das Leg beendet.');
    expect(onClose).not.toHaveBeenCalled();
  });
});
