/**
 * Whether a global keydown belongs to the score input.
 *
 * - Typing in a field is the field's business.
 * - Enter or Space on a focused button already fires that button's click;
 *   handling it here as well committed a visit twice (tap OK, then press Enter).
 * - While a dialog is open, keys belong to the dialog — Escape used to clear the
 *   visit behind an open "leave match?" dialog.
 * - Auto-repeat and modifier chords (except undo and redo) are ignored.
 */
export const shouldHandleGameKey = (e: KeyboardEvent): boolean => {
  if (e.defaultPrevented || e.repeat) return false;
  const target = e.target as HTMLElement | null;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return false;
  if (target?.isContentEditable) return false;
  if ((e.key === 'Enter' || e.key === ' ') && target?.closest?.('button, a, [role="button"], [role="option"]')) return false;
  if (typeof document !== 'undefined' && document.querySelector('[role="dialog"], [aria-modal="true"]')) return false;
  const key = e.key.toLowerCase();
  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo — never with Alt.
  const isHistoryChord = (key === 'z' || key === 'y') && (e.ctrlKey || e.metaKey) && !e.altKey;
  if ((e.ctrlKey || e.metaKey || e.altKey) && !isHistoryChord) return false;
  return true;
};
