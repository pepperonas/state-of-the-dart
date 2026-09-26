import { describe, it, expect } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../i18n/config';
import ShortcutsDialog from '../../components/common/ShortcutsDialog';

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = window) =>
  act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init })); });

describe('keyboard shortcuts overlay', () => {
  it('opens on "?" and lists the game keys', () => {
    render(<ShortcutsDialog />);
    expect(screen.queryByRole('dialog')).toBeNull();
    press('?', { shiftKey: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Enter');
    expect(dialog.textContent).toContain('Backspace');
  });

  it('closes on Escape', async () => {
    render(<ShortcutsDialog />);
    press('?', { shiftKey: true });
    expect(screen.getByRole('dialog')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('ignores "?" typed into a field', () => {
    render(<><input aria-label="name" /><ShortcutsDialog /></>);
    const input = screen.getByLabelText('name');
    press('?', { shiftKey: true }, input);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
