import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../i18n/config';
import { DartboardHeatmap } from '../../components/dartboard/DartboardHeatmap';
import type { HeatmapData } from '../../types';

const hm = (segments: Record<string, number>): HeatmapData => ({
  playerId: 'p',
  segments,
  totalDarts: Object.values(segments).reduce((a, b) => a + b, 0),
  lastUpdated: new Date(),
});

const board = () => screen.getByTestId('heatmap-board');
const bedPaths = (id: string) => Array.from(board().querySelectorAll(`path[data-bed="${id}"]`));
const level = (id: string) => Number(bedPaths(id)[0].getAttribute('data-level'));

describe('DartboardHeatmap', () => {
  it('draws every bed of the board: 20 numbers × 4 areas plus two bulls', () => {
    render(<DartboardHeatmap heatmapData={hm({ '20-3': 1 })} />);
    expect(board().querySelectorAll('path[data-bed]')).toHaveLength(82);
    // Singles cover both single areas of their number.
    expect(bedPaths('20-1')).toHaveLength(2);
  });

  it('colours exactly the bed that was hit', () => {
    render(<DartboardHeatmap heatmapData={hm({ '3x20': 4 })} />);
    expect(level('20-3')).toBe(6);
    const hot = Array.from(board().querySelectorAll('path[data-bed]')).filter(p => p.getAttribute('data-level') !== '0');
    expect(hot.map(p => p.getAttribute('data-bed'))).toEqual(['20-3']);
    expect(bedPaths('20-3')[0].getAttribute('fill')).toBe('var(--m3-heat-6)');
  });

  it('puts bull hits in the centre and never on the 6 (regression)', () => {
    render(<DartboardHeatmap heatmapData={hm({ '2x50': 3, '25-1': 1 })} />);
    expect(level('25-2')).toBeGreaterThan(0);
    expect(level('25-1')).toBeGreaterThan(0);
    for (const m of [1, 2, 3]) expect(level(`6-${m}`)).toBe(0);
  });

  it('shows misses beside the board, not on it', () => {
    render(<DartboardHeatmap heatmapData={hm({ '0-0': 2, '20-1': 2 })} />);
    expect(screen.getByTestId('heatmap-misses')).toHaveTextContent('2 Fehlwürfe (50.0 %)');
    expect(board().querySelector('path[data-bed="0-0"]')).toBeNull();
  });

  it('describes itself to screen readers and lists every bed as a button', () => {
    render(<DartboardHeatmap heatmapData={hm({ '20-3': 3, '0-0': 1 })} />);
    expect(screen.getByRole('img', { name: /3 von 4 Darts/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('heatmap-list')).getByRole('button', { name: /T20.*3 Treffer.*75\.0%/ })).toBeInTheDocument();
  });

  it('tapping a bed on the board names it in the details line', () => {
    render(<DartboardHeatmap heatmapData={hm({ '20-3': 3, '19-1': 1 })} />);
    expect(screen.getByTestId('heatmap-detail')).toHaveTextContent('Feld antippen');
    fireEvent.pointerDown(bedPaths('20-3')[0]);
    expect(screen.getByTestId('heatmap-detail')).toHaveTextContent('T20 · 3 Treffer · 75.0%');
    expect(screen.getAllByTestId('heatmap-focus')).toHaveLength(1);
    // Tapping it again clears the selection.
    fireEvent.pointerDown(bedPaths('20-3')[0]);
    expect(screen.queryByTestId('heatmap-focus')).toBeNull();
  });

  it('the list buttons highlight their bed on the board (keyboard path)', async () => {
    render(<DartboardHeatmap heatmapData={hm({ '19-3': 2, '25-2': 1 })} />);
    await userEvent.click(screen.getByRole('button', { name: /^Bull/ }));
    expect(screen.getByTestId('heatmap-detail')).toHaveTextContent('Bull · 1 Treffer');
    expect(screen.getByRole('button', { name: /^Bull/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows rates, favourite zone and legend in full mode only', () => {
    const data = hm({ '20-3': 3, '5-1': 2, '1-1': 1 });
    const { unmount } = render(<DartboardHeatmap heatmapData={data} />);
    expect(screen.getByTestId('heatmap-stats')).toHaveTextContent('50.0%');
    expect(screen.getByTestId('heatmap-zone')).toHaveTextContent('20');
    expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
    unmount();
    render(<DartboardHeatmap heatmapData={data} compact />);
    expect(screen.queryByTestId('heatmap-stats')).toBeNull();
    expect(screen.queryByTestId('heatmap-zone')).toBeNull();
    expect(screen.queryByTestId('heatmap-legend')).toBeNull();
    expect(within(screen.getByTestId('heatmap-list')).getAllByRole('button')).toHaveLength(3);
  });

  it('expands the list to every bed that was hit', async () => {
    const segs: Record<string, number> = {};
    [20, 1, 18, 4, 13, 6, 10].forEach((n, i) => { segs[`${n}-1`] = 10 - i; });
    render(<DartboardHeatmap heatmapData={hm(segs)} />);
    const list = () => within(screen.getByTestId('heatmap-list')).getAllByRole('button');
    expect(list()).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: 'Alle 7 Felder zeigen' }));
    expect(list()).toHaveLength(7);
  });
});
