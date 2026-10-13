import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '../../i18n/config';
import VisitSheet from '../../components/game/VisitSheet';
import { heatmapPlayer } from '../../utils/heatmapFocus';
import type { Throw } from '../../types/index';

/** 0.42.0 — visit history as a score sheet; the live heatmap follows the turn. */
const players = [{ playerId: 'c', name: 'Claus' }, { playerId: 'a', name: 'Ali' }, { playerId: 'm', name: 'Cameron' }];
const d = (segment: number, multiplier: number, estimated = false) => ({ segment, multiplier, score: segment * multiplier, ...(estimated ? { estimated: true } : {}) });
let n = 0;
const v = (playerId: string, score: number, remaining: number, darts: ReturnType<typeof d>[], bust = false) =>
  ({ id: `t${n++}`, playerId, score, remaining, darts, isBust: bust, timestamp: new Date(), visitNumber: 1 } as unknown as Throw);

// The pasted example: round 1 typed totals, round 2 exact darts.
const leg = [
  v('c', 12, 289, [d(12, 1, true)]), v('a', 32, 269, [d(16, 2, true)]), v('m', 12, 289, [d(12, 1, true)]),
  v('c', 54, 235, [d(9, 3), d(12, 1), d(5, 3)]), v('a', 28, 241, [d(14, 1), d(9, 1), d(5, 1)]), v('m', 31, 258, [d(11, 1), d(14, 1), d(6, 1)]),
];

describe('VisitSheet', () => {
  it('one row per round, one column per player — two rounds of three are two rows', () => {
    render(<VisitSheet players={players} legs={[{ number: 1, throws: leg }]} onEdit={vi.fn()} />);
    const rows = within(screen.getByTestId('visit-sheet')).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 rounds
    expect(within(rows[0]).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Runde#', 'Claus', 'Ali', 'Cameron']);
    expect(within(rows[2]).getAllByRole('cell').map(c => c.textContent)).toEqual(['54235T9 · 12 · T5', '28241' + '14 · 9 · 5', '3125811 · 14 · 6']);
  });

  it('a typed total shows score and rest, no bed line and no "Felder unbekannt" sentence', () => {
    render(<VisitSheet players={players} legs={[{ number: 1, throws: leg }]} onEdit={vi.fn()} />);
    const typed = screen.getAllByTestId('history-edit')[0];
    expect(typed).toHaveAttribute('data-typed', 'true');
    expect(within(typed).queryByTestId('sheet-darts')).toBeNull();
    expect(screen.getByTestId('visit-sheet')).not.toHaveTextContent('Felder unbekannt');
    expect(typed).toHaveAccessibleName(/Summe getippt/); // still told to a screen reader
  });

  it('a tap on a cell opens the correction for that visit', () => {
    const onEdit = vi.fn();
    render(<VisitSheet players={players} legs={[{ number: 1, throws: leg }]} onEdit={onEdit} />);
    fireEvent.click(screen.getAllByTestId('history-edit')[3]);
    expect(onEdit).toHaveBeenCalledWith(leg[3].id);
  });

  it('marks the player at the oche, names a bust, and heads each leg in the match view', () => {
    const bust = v('c', 0, 235, [d(20, 3), d(20, 3)], true);
    render(<VisitSheet players={players} activeId="a" showLegHeaders legs={[{ number: 1, throws: leg }, { number: 2, throws: [bust] }]} onEdit={vi.fn()} />);
    expect(screen.getByRole('columnheader', { name: 'Ali' }).className).toMatch(/primary-container/);
    expect(screen.getByRole('rowheader', { name: 'LEG 2' })).toBeInTheDocument();
    expect(screen.getAllByTestId('history-edit').at(-1)).toHaveTextContent(/Bust/);
  });

  it('no visits yet: one quiet line', () => {
    render(<VisitSheet players={players} legs={[{ number: 1, throws: [] }]} onEdit={vi.fn()} />);
    expect(screen.queryByTestId('visit-sheet')).toBeNull();
    expect(screen.getByText('Noch keine Würfe')).toBeInTheDocument();
  });
});

describe('heatmapPlayer', () => {
  it('follows the player at the oche', () => {
    expect(heatmapPlayer(null, 5, 'a')).toBe('a');
  });
  it('a pick holds for the turn it was made in, then the heatmap is back on the thrower', () => {
    const pick = { playerId: 'c', turnId: 5 };
    expect(heatmapPlayer(pick, 5, 'a')).toBe('c');
    expect(heatmapPlayer(pick, 6, 'm')).toBe('m');
    expect(heatmapPlayer(pick, 4, 'a')).toBe('a'); // an undo is a turn change too
  });
});
