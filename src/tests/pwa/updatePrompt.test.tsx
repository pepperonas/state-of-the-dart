import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import UpdatePrompt from '../../pwa/UpdatePrompt';
import { pwaStub } from '../stubs/pwa-register-react';
import { isGameRoute } from '../../utils/gameRoutes';

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><UpdatePrompt /></MemoryRouter>);

beforeEach(() => { pwaStub.needRefresh = false; pwaStub.update = vi.fn(); });

describe('UpdatePrompt', () => {
  it('offers a waiting version and reloads into it', () => {
    pwaStub.needRefresh = true;
    at('/');
    fireEvent.click(screen.getByText('pwa.reload'));
    expect(pwaStub.update).toHaveBeenCalledWith(true);
  });

  it('stays silent while a game is on screen', () => {
    pwaStub.needRefresh = true;
    at('/game');
    expect(screen.queryByText('pwa.update_available')).toBeNull();
  });

  it('shows nothing without a new version', () => {
    at('/');
    expect(screen.queryByText('pwa.update_available')).toBeNull();
  });

  it('can be dismissed', async () => {
    pwaStub.needRefresh = true;
    at('/');
    fireEvent.click(screen.getByLabelText('common.close'));
    await waitFor(() => expect(screen.queryByText('pwa.update_available')).toBeNull());
  });
});

describe('isGameRoute', () => {
  it.each(['/game', '/cricket', '/around-the-clock', '/shanghai', '/online', '/training/doubles'])('%s is a game', p => {
    expect(isGameRoute(p)).toBe(true);
  });
  it.each(['/', '/training', '/stats', '/game-history', '/settings'])('%s is not', p => {
    expect(isGameRoute(p)).toBe(false);
  });
});
