import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '../../i18n/config';
import ResumeScoreTable from '../../components/game/ResumeScoreTable';

const rows = [
  { playerId: 'm', name: 'Martin', legsWon: 1, remaining: 18, matchAverage: 41.2 },
  { playerId: 'c', name: 'Claus', legsWon: 0, remaining: 140, matchAverage: 30 },
];

describe('ResumeScoreTable', () => {
  it('shows one row per player with legs, remaining score and average', () => {
    render(<ResumeScoreTable rows={rows} totalVisits={12} />);
    const table = screen.getByRole('table', { name: 'Spielstand' });
    expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Spieler', 'Legs', 'Rest', 'Ø']);
    const martin = screen.getByTestId('resume-row-Martin');
    expect(martin).toHaveTextContent('Martin');
    expect(martin).toHaveTextContent('1');
    expect(martin).toHaveTextContent('18');
    expect(martin).toHaveTextContent('41.2');
  });

  it('marks the leg leader, and nobody when level', () => {
    const { rerender } = render(<ResumeScoreTable rows={rows} />);
    expect(within(screen.getByTestId('resume-row-Martin')).getByRole('img', { name: 'Führt im Leg' })).toBeInTheDocument();
    expect(within(screen.getByTestId('resume-row-Claus')).queryByRole('img')).toBeNull();
    rerender(<ResumeScoreTable rows={rows.map(r => ({ ...r, remaining: 301 }))} />);
    expect(screen.queryAllByRole('img', { name: 'Führt im Leg' })).toHaveLength(0);
  });

  it('says so when no dart was thrown', () => {
    const { rerender } = render(<ResumeScoreTable rows={rows} totalVisits={0} />);
    expect(screen.getByTestId('resume-no-throws')).toBeInTheDocument();
    rerender(<ResumeScoreTable rows={rows} totalVisits={3} />);
    expect(screen.queryByTestId('resume-no-throws')).toBeNull();
  });

  it('shows a dash when the server sent no remaining score', () => {
    render(<ResumeScoreTable rows={[{ playerId: 'a', name: 'Ann', legsWon: 0 }]} />);
    expect(screen.getByTestId('resume-row-Ann')).toHaveTextContent('–');
  });
});
