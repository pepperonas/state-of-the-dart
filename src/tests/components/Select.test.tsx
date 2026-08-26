import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select, { type SelectOption } from '../../components/common/Select';

const FRUIT: SelectOption<string>[] = [
  { value: 'apple', label: 'Apfel' },
  { value: 'banana', label: 'Banane' },
  { value: 'cherry', label: 'Cherry' },
];

function setup(props: Partial<React.ComponentProps<typeof Select<string>>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <Select<string>
      value={props.value === undefined ? 'apple' : props.value}
      onChange={onChange}
      options={FRUIT}
      aria-label="Frucht"
      {...props}
    />
  );
  return { onChange, trigger: screen.getByRole('combobox', { name: 'Frucht' }), ...utils };
}

const listbox = () => screen.getByRole('listbox');

describe('Select', () => {
  it('shows the label of the current value, not its raw value', () => {
    const { trigger } = setup({ value: 'banana' });
    expect(trigger).toHaveTextContent('Banane');
    expect(trigger).not.toHaveTextContent('banana');
  });

  it('shows the placeholder when the value matches no option', () => {
    setup({ value: null, placeholder: 'Bitte wählen' });
    expect(screen.getByRole('combobox')).toHaveTextContent('Bitte wählen');
  });

  it('is closed until asked, and reports that through aria-expanded', async () => {
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(listbox()).getAllByRole('option')).toHaveLength(3);
  });

  it('commits the option that was clicked and closes', async () => {
    const { trigger, onChange } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('option', { name: /Cherry/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('cherry');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  /**
   * The whole reason `value` is generic. The native control stringifies, which
   * is why every numeric call site had to `parseInt` on the way back out.
   */
  it('hands back the value at its original type', async () => {
    const onChange = vi.fn();
    render(
      <Select<number>
        value={10}
        onChange={onChange}
        options={[10, 20, 50].map((n) => ({ value: n, label: String(n) }))}
        aria-label="Anzahl"
      />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: '50' }));
    expect(onChange).toHaveBeenCalledWith(50);
    expect(typeof onChange.mock.calls[0][0]).toBe('number');
  });

  it('marks exactly the selected option with aria-selected', async () => {
    const { trigger } = setup({ value: 'banana' });
    await userEvent.click(trigger);
    const selected = within(listbox())
      .getAllByRole('option')
      .filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Banane');
  });

  describe('keyboard', () => {
    it('opens on ArrowDown and commits with Enter', async () => {
      const { trigger, onChange } = setup({ value: 'apple' });
      trigger.focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenCalledWith('banana');
    });

    it('Escape closes without choosing anything', async () => {
      const { trigger, onChange } = setup();
      trigger.focus();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Escape}');
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    /** Tab means "leave", not "choose" — a stray Tab must not rewrite the value. */
    it('Tab closes without choosing anything', async () => {
      const { trigger, onChange } = setup();
      trigger.focus();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      await userEvent.tab();
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Home and End jump to the ends of the list', async () => {
      const { trigger, onChange } = setup({ value: 'banana' });
      trigger.focus();
      await userEvent.keyboard('{ArrowDown}{End}{Enter}');
      expect(onChange).toHaveBeenLastCalledWith('cherry');

      await userEvent.keyboard('{ArrowDown}{Home}{Enter}');
      expect(onChange).toHaveBeenLastCalledWith('apple');
    });

    /**
     * A multi-character prefix has to accumulate. Pinned after a browser run
     * showed the anchor going stale when the page was re-rendering heavily —
     * the search then started from the wrong row and "180" landed on 175.
     */
    it('builds a multi-character prefix', async () => {
      const onChange = vi.fn();
      const scores = Array.from({ length: 181 }, (_, i) => ({ value: i, label: String(i) }));
      render(<Select<number> value={null} onChange={onChange} options={scores} aria-label="Punkte" placeholder="p" />);
      const trigger = screen.getByRole('combobox', { name: 'Punkte' });
      trigger.focus();
      await userEvent.keyboard('180');
      const active = trigger.getAttribute('aria-activedescendant');
      expect(document.getElementById(active!)).toHaveTextContent('180');
      await userEvent.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith(180);
    });

    it('typing a prefix jumps to the matching option', async () => {
      const { trigger, onChange } = setup({ value: 'apple' });
      trigger.focus();
      await userEvent.keyboard('b');
      await userEvent.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith('banana');
    });

    /**
     * Once the buffer has timed out, the same letter must advance to the next
     * match instead of re-selecting the current one — that is what the search
     * offset is for, and what makes a long list walkable.
     */
    it('the same letter steps to the next match after the buffer expires', async () => {
      const onChange = vi.fn();
      render(
        <Select<string>
          value={null}
          onChange={onChange}
          aria-label="Namen"
          placeholder="p"
          options={[
            { value: 'a1', label: 'Alpha' },
            { value: 'b', label: 'Bravo' },
            { value: 'a2', label: 'Anchor' },
          ]}
        />
      );
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      const activeText = () =>
        document.getElementById(trigger.getAttribute('aria-activedescendant')!)?.textContent;

      await userEvent.keyboard('a');
      expect(activeText()).toBe('Alpha');

      // Past TYPEAHEAD_RESET_MS, so this is a fresh search, not the prefix "aa".
      await new Promise((r) => setTimeout(r, 700));
      await userEvent.keyboard('a');
      expect(activeText()).toBe('Anchor');
    });

    it('names the active option through aria-activedescendant', async () => {
      const { trigger } = setup({ value: 'apple' });
      trigger.focus();
      await userEvent.keyboard('{ArrowDown}');
      const active = trigger.getAttribute('aria-activedescendant');
      expect(active).toBeTruthy();
      expect(document.getElementById(active!)).toHaveAttribute('role', 'option');
    });
  });

  describe('disabled options', () => {
    const WITH_DISABLED: SelectOption<string>[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
    ];

    it('are skipped by the arrow keys', async () => {
      const onChange = vi.fn();
      render(<Select<string> value="a" onChange={onChange} options={WITH_DISABLED} aria-label="X" />);
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenCalledWith('c');
    });

    it('cannot be committed by clicking them', async () => {
      const onChange = vi.fn();
      render(<Select<string> value="a" onChange={onChange} options={WITH_DISABLED} aria-label="X" />);
      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByRole('option', { name: 'B' }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('a disabled select does not open', async () => {
    const { trigger } = setup({ disabled: true });
    await userEvent.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('an empty option list says so instead of opening a blank box', async () => {
    render(<Select<string> value={null} onChange={vi.fn()} options={[]} aria-label="Leer" emptyLabel="Nichts da" />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    // Nothing to choose — the menu stays shut rather than offering an empty list.
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  /**
   * The reason the menu is portalled: the admin status pickers sit inside
   * `overflow-x-auto` tables and several selects sit inside dialogs. Rendered
   * inline the list would be clipped or painted under the scrim.
   */
  it('renders the menu outside its container, on document.body', async () => {
    const { container } = render(
      <div style={{ overflow: 'hidden' }} data-testid="clip">
        <Select<string> value="apple" onChange={vi.fn()} options={FRUIT} aria-label="Frucht" />
      </div>
    );
    await userEvent.click(screen.getByRole('combobox'));
    const menu = screen.getByRole('listbox');
    expect(container.contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
  });

  it('clicking outside closes it without choosing', async () => {
    const onChange = vi.fn();
    render(
      <div>
        <Select<string> value="apple" onChange={onChange} options={FRUIT} aria-label="Frucht" />
        <button>anderswo</button>
      </div>
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'anderswo' }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  /** ScoreInput's quick-score menu is an action list: it must never latch. */
  it('keeps showing the placeholder when used as an action menu', async () => {
    const onChange = vi.fn();
    render(
      <Select<number>
        value={null}
        onChange={onChange}
        options={[60, 100, 180].map((n) => ({ value: n, label: String(n) }))}
        placeholder="Weitere Punktzahlen"
        aria-label="Weitere Punktzahlen"
      />
    );
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('option', { name: '180' }));
    expect(onChange).toHaveBeenCalledWith(180);
    expect(trigger).toHaveTextContent('Weitere Punktzahlen');
  });
});
