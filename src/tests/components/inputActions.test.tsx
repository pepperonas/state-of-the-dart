import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../i18n/config';
import ScoreInput from '../../components/game/ScoreInput';
import type { Dart } from '../../types/index';

/**
 * 0.37.0 — the input below the numpad. One filled button ("Bestätigen"): the
 * numpad's check key duplicated it, undo was a purple slab, clear was red. The
 * numpad's bottom-left key is now backspace (digit, then last dart).
 */
const T20: Dart = { segment: 20, multiplier: 3, score: 60 } as Dart;

const setup = (over: Partial<React.ComponentProps<typeof ScoreInput>> = {}) => {
  const props = {
    currentThrow: [] as Dart[], onAddDart: vi.fn(), onRemoveDart: vi.fn(), onClearThrow: vi.fn(),
    onConfirm: vi.fn(), editingDartIndex: null, onSetEditingDartIndex: vi.fn(), remaining: 501,
    onCommitDarts: vi.fn(), ...over,
  };
  render(<ScoreInput {...props} />);
  return props;
};

beforeEach(() => localStorage.clear());

describe('numpad', () => {
  it('has no check key — 7 8 9 / 4 5 6 / 1 2 3 / backspace 0', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Wurf-Summe übernehmen/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'C' })).toBeNull();
    expect(screen.getByTestId('numpad-back')).toBeInTheDocument();
  });

  it('backspace removes the last digit first, then the last dart', () => {
    const props = setup({ currentThrow: [T20] });
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByTestId('numpad-back'));
    expect(props.onRemoveDart).not.toHaveBeenCalled();
    expect(screen.getByTestId('visit-total')).toHaveTextContent(/^Getippt\s*4$|4$/);
    expect(screen.getByTestId('visit-total')).not.toHaveTextContent('45');
    fireEvent.click(screen.getByTestId('numpad-back'));
    fireEvent.click(screen.getByTestId('numpad-back'));
    expect(props.onRemoveDart).toHaveBeenCalledTimes(1);
  });

  it('"Bestätigen" takes a typed total, like the old check key', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: '6' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: /Bestätigen/ }));
    expect(props.onCommitDarts).toHaveBeenCalledTimes(1);
  });

  it('with a dart being edited, "Bestätigen" sets that dart instead of booking the visit', () => {
    const props = setup({ currentThrow: [T20], editingDartIndex: 0, onReplaceDart: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: /Dart ersetzen/ }));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onReplaceDart).toHaveBeenCalledWith(0, expect.objectContaining({ score: 19 }));
  });
});

describe('action row', () => {
  it('confirm is the only filled button; undo is tonal, clear neutral', () => {
    setup({ currentThrow: [T20], onUndoThrow: vi.fn(), lastThrow: null, dense: true });
    const actions = screen.getByTestId('input-actions');
    const filled = [...actions.querySelectorAll('button')].filter(b => /\bbg-(primary|error|tertiary|success)\b/.test(b.className));
    expect(filled.map(b => b.textContent)).toEqual([expect.stringMatching(/Bestätigen/)]);
    expect(screen.getByTestId('undo-throw').className).toMatch(/bg-secondary-container/);
    expect(screen.getByRole('button', { name: /Aufnahme leeren|leeren/i }).className).not.toMatch(/error/);
  });

  it('with the numpad open, its backspace replaces the "remove dart" button', () => {
    setup({ currentThrow: [T20] });
    expect(screen.queryByRole('button', { name: 'Letzten Dart löschen' })).toBeNull();
  });

  it('in dart mode there is no numpad, so "remove dart" is back', () => {
    localStorage.setItem('sotd-input-mode', 'darts');
    setup({ currentThrow: [T20] });
    expect(screen.getByRole('button', { name: 'Letzten Dart löschen' })).toBeInTheDocument();
  });

  it('the keyboard hint is a link to the shortcuts dialog, not a sentence', () => {
    const open = vi.fn();
    window.addEventListener('sotd:shortcuts', open);
    setup();
    expect(screen.queryByText(/Strg\+Z Wurf zurück/)).toBeNull();
    fireEvent.click(screen.getByTestId('shortcuts-link'));
    expect(open).toHaveBeenCalledTimes(1);
    window.removeEventListener('sotd:shortcuts', open);
  });
});
