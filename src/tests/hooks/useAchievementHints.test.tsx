import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// A fresh function identity on every call, like an unmemoized context value.
vi.mock('../../context/AchievementContext', () => ({
  useAchievements: () => ({
    getLockedAchievements: () => [{ id: 'high_roller', name: 'High Roller', icon: 'target' }],
  }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useAchievementHints } from '../../hooks/useAchievementHints';

let renders = 0;
const Probe = ({ avg }: { avg: number }) => {
  renders++;
  // Inline object, rebuilt every render — exactly how GameScreen calls it.
  const hints = useAchievementHints('p1', { matchAverage: avg, score180s: 0, checkoutRate: 0 });
  return <div data-testid="hints">{hints.map(h => h.achievementId).join(',')}</div>;
};

describe('useAchievementHints', () => {
  it('does not loop when the caller passes a new object every render', () => {
    renders = 0;
    const { getByTestId } = render(<Probe avg={57} />);
    expect(getByTestId('hints').textContent).toBe('high_roller');
    // One render, not an update-depth explosion.
    expect(renders).toBeLessThanOrEqual(2);
  });

  it('recomputes when the numbers change', () => {
    const { getByTestId, rerender } = render(<Probe avg={40} />);
    expect(getByTestId('hints').textContent).toBe('');
    rerender(<Probe avg={58} />);
    expect(getByTestId('hints').textContent).toBe('high_roller');
  });
});
