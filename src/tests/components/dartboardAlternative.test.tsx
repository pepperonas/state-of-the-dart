import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Dartboard from '../../components/dartboard/Dartboard';
import { BOARD_ROUTE, BOARD_ALT } from '../../components/dartboard/boardColors';

/** Bug reports 21./22.02.: the alternative checkout is marked on the board in a second colour. */
describe('Dartboard — alternative route', () => {
  const fills = (c: HTMLElement) => [...c.querySelectorAll('path, circle')].map(e => e.getAttribute('fill'));

  it('route in gold, alternative in blue; the route wins on a shared bed', () => {
    const { container } = render(<Dartboard highlightedSegments={['T20', 'D18']} alternativeSegments={['T18', 'D18', '25']} />);
    const f = fills(container);
    expect(f.filter(x => x === BOARD_ROUTE)).toHaveLength(2); // T20, D18
    expect(f.filter(x => x === BOARD_ALT)).toHaveLength(2);   // T18, outer bull ('25')
  });
  it('no alternative, no blue', () => {
    const { container } = render(<Dartboard highlightedSegments={['D16']} />);
    expect(fills(container)).not.toContain(BOARD_ALT);
  });
});
