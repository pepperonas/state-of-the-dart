import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import '../../i18n/config';
import ScoreInput from '../../components/game/ScoreInput';
import { shouldHandleGameKey } from '../../utils/gameKeys';
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
    fireEvent.click(screen.getByRole('radio', { name: /schnell/i }));
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

describe('ScoreInput dart grid', () => {
  const grid = () => {
    localStorage.setItem('sotd-input-mode', 'darts');
    return setup({ currentThrow: [] });
  };

  it('adds the exact bed: treble 20', () => {
    const props = grid();
    fireEvent.click(screen.getByRole('radio', { name: 'Triple' }));
    fireEvent.click(screen.getByRole('button', { name: 'Triple 20' }));
    expect(props.onAddDart).toHaveBeenCalledWith(expect.objectContaining({ segment: 20, multiplier: 3, score: 60 }));
  });

  it('falls back to single after each dart', () => {
    const props = grid();
    fireEvent.click(screen.getByRole('radio', { name: 'Double' }));
    fireEvent.click(screen.getByRole('button', { name: 'Double 16' }));
    fireEvent.click(screen.getByRole('button', { name: 'Single 5' }));
    expect(props.onAddDart).toHaveBeenLastCalledWith(expect.objectContaining({ segment: 5, multiplier: 1, score: 5 }));
  });

  it('bull is a double 50, outer bull a single 25, miss scores nothing', () => {
    const props = grid();
    fireEvent.click(screen.getByRole('button', { name: 'Bull' }));
    fireEvent.click(screen.getByRole('button', { name: '25' }));
    fireEvent.click(screen.getByRole('button', { name: 'Miss' }));
    expect(vi.mocked(props.onAddDart).mock.calls.map(c => [c[0].score, c[0].multiplier]))
      .toEqual([[50, 2], [25, 1], [0, 0]]);
  });
});

describe('ScoreInput numpad checkout', () => {
  it('typing the remaining score enters a checkout route that ends on a double', () => {
    const onAddDart = vi.fn();
    setup({ currentThrow: [], remaining: 141, doubleOut: true, onAddDart });
    for (const k of ['1', '4', '1', 'Enter']) fireEvent.keyDown(window, { key: k });
    const darts = onAddDart.mock.calls.map((c: unknown[]) => c[0] as Dart);
    expect(darts.reduce((s, d) => s + d.score, 0)).toBe(141);
    expect(darts[darts.length - 1].multiplier).toBe(2);
  });
});
