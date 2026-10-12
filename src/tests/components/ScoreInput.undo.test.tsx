import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '../../i18n/config';
import ScoreInput from '../../components/game/ScoreInput';
import type { Dart } from '../../types/index';

const T20: Dart = { segment: 20, multiplier: 3, score: 60 } as Dart;

const setup = (overrides: Partial<React.ComponentProps<typeof ScoreInput>> = {}) => {
  const props = {
    currentThrow: [] as Dart[],
    onAddDart: vi.fn(),
    onRemoveDart: vi.fn(),
    onClearThrow: vi.fn(),
    onConfirm: vi.fn(),
    editingDartIndex: null,
    onSetEditingDartIndex: vi.fn(),
    remaining: 501,
    onUndoThrow: vi.fn(),
    lastThrow: { playerName: 'Alice', score: 140 },
    ...overrides,
  };
  render(<ScoreInput {...props} />);
  return props;
};

const undoButton = () => screen.getByRole('button', { name: /wurf zurück/i });

describe('ScoreInput — taking back a throw', () => {
  it('offers the undo right in the input card, labelled with the throw it would take back', async () => {
    setup();
    const button = undoButton();

    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Alice');
    expect(button).toHaveTextContent('140');
  });

  it('calls back when pressed', async () => {
    const props = setup();
    await userEvent.click(undoButton());
    expect(props.onUndoThrow).toHaveBeenCalledTimes(1);
  });

  it('labels a taken-back bust as such instead of showing a bare 0', () => {
    setup({ lastThrow: { playerName: 'Bob', score: 0, isBust: true } });
    expect(undoButton()).toHaveTextContent('Bust');
  });

  it('stays disabled while darts are pending — undoing would overwrite them', async () => {
    const props = setup({ currentThrow: [T20] });

    expect(undoButton()).toBeDisabled();
    await userEvent.click(undoButton());
    expect(props.onUndoThrow).not.toHaveBeenCalled();
  });

  it('is disabled when there is nothing to take back', () => {
    setup({ lastThrow: null });
    expect(undoButton()).toBeDisabled();
  });

  it('takes the throw back on Backspace once the visit is empty', async () => {
    const props = setup();
    await userEvent.keyboard('{Backspace}');

    expect(props.onUndoThrow).toHaveBeenCalledTimes(1);
    expect(props.onRemoveDart).not.toHaveBeenCalled();
  });

  it('Backspace still deletes the pending dart first', async () => {
    const props = setup({ currentThrow: [T20] });
    await userEvent.keyboard('{Backspace}');

    expect(props.onRemoveDart).toHaveBeenCalledTimes(1);
    expect(props.onUndoThrow).not.toHaveBeenCalled();
  });

  it('takes the throw back on Ctrl+Z', async () => {
    const props = setup();
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(props.onUndoThrow).toHaveBeenCalledTimes(1);
  });

  it('renders no undo control at all when the screen does not support it', () => {
    setup({ onUndoThrow: undefined });
    expect(screen.queryByRole('button', { name: /wurf zurück/i })).toBeNull();
  });
});

describe('ScoreInput — redo after one undo too many (0.35.0)', () => {
  const redoButton = () => screen.getByTestId('redo-throw');

  it('appears only when there is a visit to bring back, named after it', () => {
    setup({ onRedoThrow: vi.fn(), nextThrow: null });
    expect(screen.queryByTestId('redo-throw')).toBeNull();
  });

  it('brings the visit back on a click', async () => {
    const props = setup({ onRedoThrow: vi.fn(), nextThrow: { playerName: 'Bob', score: 60 } });
    expect(redoButton()).toHaveAccessibleName(/Wurf vor: Bob · 60/);
    await userEvent.click(redoButton());
    expect(props.onRedoThrow).toHaveBeenCalledTimes(1);
  });

  it('works while undo put the darts back into the input', async () => {
    const props = setup({ currentThrow: [T20], onRedoThrow: vi.fn(), nextThrow: { playerName: 'Bob', score: 60 } });
    await userEvent.click(redoButton());
    expect(props.onRedoThrow).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Shift+Z and Ctrl+Y redo, Ctrl+Z still undoes', async () => {
    const props = setup({ onRedoThrow: vi.fn(), nextThrow: { playerName: 'Bob', score: 60 } });
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    await userEvent.keyboard('{Control>}y{/Control}');
    expect(props.onRedoThrow).toHaveBeenCalledTimes(2);
    expect(props.onUndoThrow).not.toHaveBeenCalled();
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(props.onUndoThrow).toHaveBeenCalledTimes(1);
  });

  it('has a compact icon button on phones too', async () => {
    const props = setup({ dense: true, onRedoThrow: vi.fn(), nextThrow: { playerName: 'Bob', score: 60 } });
    await userEvent.click(redoButton());
    expect(props.onRedoThrow).toHaveBeenCalledTimes(1);
  });

  it('is not offered while a confirmed visit waits for the next player', () => {
    setup({ onRedoThrow: vi.fn(), nextThrow: { playerName: 'Bob', score: 60 }, awaitingNextPlayer: 'Bob', onNextPlayer: vi.fn() });
    expect(screen.queryByTestId('redo-throw')).toBeNull();
  });
});
