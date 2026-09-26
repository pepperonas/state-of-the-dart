import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import InstallCard, { FINISHED_MATCH_KEY } from '../../pwa/InstallCard';
import { captureInstallPrompt, __resetInstallPrompt } from '../../pwa/installPrompt';

const offer = () => {
  const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
  e.prompt = vi.fn().mockResolvedValue(undefined);
  e.userChoice = Promise.resolve({ outcome: 'accepted' });
  act(() => { window.dispatchEvent(e); });
  return e;
};

beforeAll(() => {
  window.matchMedia = window.matchMedia || ((() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never);
  captureInstallPrompt();
});
beforeEach(() => { localStorage.clear(); __resetInstallPrompt(); });

describe('InstallCard', () => {
  it('stays hidden before the first finished match, even with an install offer', () => {
    offer();
    render(<InstallCard />);
    expect(screen.queryByText('pwa.install_title')).toBeNull();
  });

  it('offers the install after a finished match — also when the offer came before the card mounted', async () => {
    localStorage.setItem(FINISHED_MATCH_KEY, '1');
    const e = offer();
    render(<InstallCard />);
    await act(async () => { fireEvent.click(screen.getByText('pwa.install_action')); });
    expect(e.prompt).toHaveBeenCalled();
  });

  it('"later" is remembered', () => {
    localStorage.setItem(FINISHED_MATCH_KEY, '1');
    offer();
    const { unmount } = render(<InstallCard />);
    fireEvent.click(screen.getByText('pwa.install_later'));
    unmount();
    render(<InstallCard />);
    expect(screen.queryByText('pwa.install_title')).toBeNull();
  });

  it('shows nothing without an offer (and not on iOS)', () => {
    localStorage.setItem(FINISHED_MATCH_KEY, '1');
    render(<InstallCard />);
    expect(screen.queryByText('pwa.install_title')).toBeNull();
  });
});
