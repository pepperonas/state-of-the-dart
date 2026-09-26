import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../i18n/config';
import Menu from '../../components/common/Menu';

const setup = (onPick = vi.fn()) => {
  render(
    <>
      <Menu
        label="Export"
        items={[
          { id: 'csv', label: 'CSV', onSelect: () => onPick('csv') },
          { id: 'xlsx', label: 'Excel', onSelect: () => onPick('xlsx') },
          { id: 'pdf', label: 'PDF', onSelect: () => onPick('pdf'), disabled: true },
        ]}
      >
        Exportieren
      </Menu>
      <button>after</button>
    </>,
  );
  return { trigger: screen.getByRole('button', { name: 'Exportieren' }), onPick };
};

describe('Menu (APG menu button)', () => {
  it('opens on click with focus on the first item, and names its trigger', async () => {
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Export' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus());
  });

  it('arrow keys move through the enabled items and wrap', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Excel' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}'); // PDF is disabled → wraps to CSV
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Excel' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Excel' })).toHaveFocus();
  });

  it('Enter selects, closes and returns focus to the trigger', async () => {
    const { trigger, onPick } = setup();
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenCalledWith('xlsx');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('Escape closes without selecting; ArrowDown on the trigger opens it', async () => {
    const { trigger, onPick } = setup();
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('a click outside closes it', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'after' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('a disabled item cannot be chosen', async () => {
    const { trigger, onPick } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('menuitem', { name: 'PDF' }));
    expect(onPick).not.toHaveBeenCalled();
  });
});
