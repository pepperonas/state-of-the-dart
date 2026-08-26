import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivitySparkline from '../../components/admin/ActivitySparkline';

describe('ActivitySparkline', () => {
  it('draws one bar per day', () => {
    const { container } = render(<ActivitySparkline values={new Array(30).fill(1)} />);
    expect(container.querySelectorAll('rect')).toHaveLength(30);
  });

  /** A chart is useless to a screen reader unless it says what it shows. */
  it('states the numbers in its accessible name', () => {
    render(<ActivitySparkline values={[0, 2, 0, 3]} />);
    const label = screen.getByRole('img').getAttribute('aria-labelledby');
    expect(document.getElementById(label!)?.textContent).toBe(
      '5 Spiele an 2 von 4 Tagen, Spitze 3 an einem Tag'
    );
  });

  it('says so plainly when there was no activity', () => {
    render(<ActivitySparkline values={[0, 0, 0]} />);
    const label = screen.getByRole('img').getAttribute('aria-labelledby');
    expect(document.getElementById(label!)?.textContent).toContain('Keine Aktivität');
  });

  it('renders a dash rather than an empty chart when there is no data at all', () => {
    const { container } = render(<ActivitySparkline values={[]} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('–');
  });

  /** Colour comes from tokens so the chart follows the light/dark theme. */
  it('paints from currentColor, not a fixed palette', () => {
    const { container } = render(<ActivitySparkline values={[1, 0]} />);
    const rects = [...container.querySelectorAll('rect')];
    expect(rects.every((r) => r.getAttribute('fill') === 'currentColor')).toBe(true);
    expect(rects[0].getAttribute('class')).toContain('text-primary');
    expect(rects[1].getAttribute('class')).toContain('text-outline-variant');
  });
});
