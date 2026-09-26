import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import '../../i18n/config';
import ScoreInput, { shouldHandleGameKey } from '../../components/game/ScoreInput';
import type { Dart } from '../../types/index';

const T20: Dart = { segment: 20, multiplier: 3, score: 60 } as Dart;

const setup = (overrides: Partial<React.ComponentProps<typeof ScoreInput>> = {}) => {
  const props = {
    currentThrow: [T20] as Dart[],
    onAddDart: vi.fn(),
    onRemoveDart: vi.fn(),
    onClearThrow: vi.fn(),
    onConfirm: vi.fn(),
    editingDartIndex: null,
    onSetEditingDartIndex: vi.fn(),
    remaining: 501,
    ...overrides,
  };
  render(<ScoreInput {...props} />);
  return props;
};

const key = (target: EventTarget, init: KeyboardEventInit) => {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};

beforeEach(() => localStorage.clear());

describe('ScoreInput keyboard', () => {
  it('Escape does not clear the visit while a dialog is open', () => {
    const props = setup();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    key(window, { key: 'Escape' });
    expect(props.onClearThrow).not.toHaveBeenCalled();
    dialog.remove();
    key(window, { key: 'Escape' });
    expect(props.onClearThrow).toHaveBeenCalledTimes(1);
  });

  it('Enter on a focused button is left to the button', () => {
    const props = setup({ currentThrow: [T20, T20, T20] });
    const button = document.createElement('button');
    document.body.appendChild(button);
    key(button, { key: 'Enter' });
    expect(props.onConfirm).not.toHaveBeenCalled();
    button.remove();
  });

  it('remembers the input mode', () => {
    setup();
    fireEvent.click(screen.getAllByRole('button').find(b => /quick|schnell/i.test(b.textContent || ''))!);
    expect(localStorage.getItem('sotd-input-mode')).toBe('quick');
  });
});

describe('shouldHandleGameKey', () => {
  const ev = (init: KeyboardEventInit, target?: HTMLElement) => {
    const e = new KeyboardEvent('keydown', init);
    if (target) Object.defineProperty(e, 'target', { value: target });
    return e;
  };
  it('ignores auto-repeat and browser shortcuts, keeps Ctrl+Z', () => {
    expect(shouldHandleGameKey(ev({ key: '5', repeat: true }))).toBe(false);
    expect(shouldHandleGameKey(ev({ key: 'r', ctrlKey: true }))).toBe(false);
    expect(shouldHandleGameKey(ev({ key: 'z', metaKey: true }))).toBe(true);
    expect(shouldHandleGameKey(ev({ key: '5' }))).toBe(true);
  });
  it('ignores typing in a field', () => {
    expect(shouldHandleGameKey(ev({ key: '5' }, document.createElement('input')))).toBe(false);
  });
});
