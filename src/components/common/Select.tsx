import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Material 3 Expressive select — the app's one dropdown.
 *
 * A native `<select>` draws its popup outside the page, in the OS layer. Nothing
 * in `m3.css` can reach it: the list stayed platform-grey at platform font size,
 * ignored the light/dark switch (`index.css` needed a `select option` override
 * just to keep it readable), and could show neither the player avatars nor the
 * coloured status pills the app puts in its options. This renders the list as
 * ordinary DOM, so it themes, animates and can hold real content.
 *
 * ── Two things here are load-bearing ────────────────────────────────────────
 *
 * 1. The menu is PORTALLED to `document.body`. It has to be: the admin status
 *    pickers live inside `overflow-x-auto` tables and several selects live
 *    inside `Dialog`, whose scrim is its own stacking context. Rendered inline,
 *    the list would be clipped by the table or painted under the dialog — the
 *    two places the native popup had always escaped. Hence `position: fixed`
 *    plus explicit measurement, rather than `absolute` inside the trigger.
 *
 * 2. `value` is generic, not a string. The native control stringifies
 *    everything, which is why the call sites all had to `parseInt(e.target.value)`
 *    on the way back out — a silent `NaN` waiting to happen. `onChange` here
 *    hands back the value that was put in, at its original type.
 *
 * Keyboard follows the APG combobox-with-listbox pattern: focus stays on the
 * trigger and the active option is named by `aria-activedescendant`. Enter/Space
 * and the arrow keys open; arrows/Home/End move; Enter/Space commit; Escape
 * closes without committing; Tab closes and moves on; typing jumps by prefix.
 */

export interface SelectOption<T> {
  value: T;
  /** Rendered in the list and, when chosen, in the trigger. */
  label: React.ReactNode;
  /**
   * Plain-text form of `label`, used for typeahead. Only needed when `label` is
   * a node rather than a string.
   */
  text?: string;
  disabled?: boolean;
  /** Leading icon/avatar for the row. */
  icon?: React.ReactNode;
}

export type SelectSize = 'sm' | 'md' | 'lg';

interface SelectProps<T> {
  value: T | null | undefined;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Shown when `value` matches no option. */
  placeholder?: string;
  disabled?: boolean;
  size?: SelectSize;
  /** Extra classes for the trigger. Caller classes beat the component's own
   *  colours by design — see the specificity note in `m3.css` § 7e2. */
  className?: string;
  /** Let the trigger size to its content instead of filling the row. */
  inline?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Message for an empty option list. */
  emptyLabel?: string;
}

const SIZE_CLASS: Record<SelectSize, string> = {
  sm: 'm3-select-sm',
  md: 'm3-select-md',
  lg: 'm3-select-lg',
};

const ARROW_SIZE: Record<SelectSize, number> = { sm: 14, md: 16, lg: 20 };

/** Menu geometry, in viewport coordinates. */
interface MenuPos {
  left: number;
  width: number;
  minWidth: number;
  maxHeight: number;
  /** Set when the menu hangs below the trigger. */
  top?: number;
  /** Set when the menu is flipped above it. */
  bottom?: number;
  up: boolean;
}

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;
const MENU_MAX_HEIGHT = 320;
/** Below this the menu is too cramped to be worth keeping on that side. */
const MENU_MIN_HEIGHT = 120;
const TYPEAHEAD_RESET_MS = 600;

/** Text used for typeahead. Falls back to the label when it is already a string. */
function optionText<T>(o: SelectOption<T>): string {
  if (o.text != null) return o.text;
  return typeof o.label === 'string' ? o.label : typeof o.label === 'number' ? String(o.label) : '';
}

/**
 * Advances the typeahead buffer and returns the option index to jump to, or -1.
 *
 * Module scope on purpose: `Date.now()` inside a function declared in the render
 * body trips `react-hooks/purity`, which cannot see that this only ever runs
 * from a keydown handler. Lifting it out states that plainly — and makes the
 * matcher directly testable.
 */
function resolveTypeahead<T>(
  state: { buffer: string; at: number },
  char: string,
  options: SelectOption<T>[],
  from: number
): number {
  if (options.length === 0) return -1;

  const now = Date.now();
  state.buffer = now - state.at > TYPEAHEAD_RESET_MS ? char : state.buffer + char;
  state.at = now;

  const needle = state.buffer.toLowerCase();
  const start = ((from % options.length) + options.length) % options.length;
  for (let n = 0; n < options.length; n++) {
    const i = (start + n) % options.length;
    const o = options[i];
    if (!o.disabled && optionText(o).toLowerCase().startsWith(needle)) return i;
  }
  return -1;
}

function Select<T>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  size = 'md',
  className = '',
  inline = false,
  id,
  name,
  emptyLabel = 'Keine Optionen',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: SelectProps<T>) {
  const autoId = useId();
  const baseId = id ?? `sel-${autoId}`;
  const listId = `${baseId}-list`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  // `anchor` mirrors `activeIndex` for the typeahead. It lives in the ref on
  // purpose: reading the index out of the render closure makes prefix search
  // depend on React having re-rendered between keystrokes, and under heavy
  // re-rendering elsewhere on the page that lag sends the search off from the
  // wrong row. The ref is always current.
  const typeahead = useRef({ buffer: '', at: 0, anchor: -1 });

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const selectedIndex = options.findIndex((o) => Object.is(o.value, value));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  /* --- positioning -------------------------------------------------------- */

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger) return;

    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const below = vh - r.bottom - VIEWPORT_MARGIN - TRIGGER_GAP;
    const above = r.top - VIEWPORT_MARGIN - TRIGGER_GAP;

    // `scrollHeight` is the list's natural height — what it *wants*. Flip only
    // when the space below cannot hold a usable menu and the space above is
    // genuinely better, so a select near the fold does not jitter side to side.
    const wanted = menu ? menu.scrollHeight : 0;
    const up = below < Math.min(wanted, MENU_MIN_HEIGHT) && above > below;
    const room = up ? above : below;
    const maxHeight = Math.max(MENU_MIN_HEIGHT, Math.min(MENU_MAX_HEIGHT, room));

    // At least as wide as the trigger, but allowed to grow for long labels —
    // the pagination selects are ~60px wide and their options are not.
    const natural = menu ? menu.scrollWidth + 2 : 0;
    const width = Math.min(Math.max(natural, r.width), vw - 2 * VIEWPORT_MARGIN);

    let left = r.left;
    if (left + width > vw - VIEWPORT_MARGIN) left = vw - VIEWPORT_MARGIN - width;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    setPos({
      left,
      width,
      minWidth: r.width,
      maxHeight,
      up,
      top: up ? undefined : r.bottom + TRIGGER_GAP,
      bottom: up ? vh - r.top + TRIGGER_GAP : undefined,
    });
  }, []);

  // Measure once the list exists, but before the browser paints it — the DOM
  // measurement escape hatch `useLayoutEffect` exists for. React flushes the
  // re-render this causes ahead of paint, so a reopened menu is never shown at
  // its previous position for a frame; that is also why `pos` is not cleared on
  // close. Only the very first open renders unmeasured, and `visibility` covers it.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, options.length]);

  useEffect(() => {
    if (!open) return;
    // `capture` so scrolling *any* ancestor — a dialog body, a table — is seen,
    // not just the window. A fixed menu does not move with its trigger.
    const onScroll = () => place();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, place]);

  /* --- dismissal ---------------------------------------------------------- */

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent | MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  /* --- keep the active row in view ---------------------------------------- */

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  /* --- behaviour ---------------------------------------------------------- */

  /** Single place that moves the highlight, so the typeahead anchor cannot drift. */
  const setActive = (index: number) => {
    typeahead.current.anchor = index;
    setActiveIndex(index);
  };

  const firstEnabled = (from: number, step: number): number => {
    for (let i = from; i >= 0 && i < options.length; i += step) {
      if (!options[i].disabled) return i;
    }
    return -1;
  };

  const openMenu = (start?: number) => {
    if (disabled || options.length === 0) return;
    const from = start ?? (selectedIndex >= 0 ? selectedIndex : 0);
    setActive(options[from]?.disabled ? firstEnabled(from, 1) : from);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (step: number) => {
    const from = activeIndex < 0 ? (selectedIndex >= 0 ? selectedIndex : 0) : activeIndex + step;
    const next = firstEnabled(Math.max(0, Math.min(options.length - 1, from)), step);
    if (next >= 0) setActive(next);
  };

  const jumpByPrefix = (char: string) => {
    const state = typeahead.current;
    // Search starts *after* the current row, so pressing the same letter again
    // once the buffer has timed out steps to the NEXT match rather than sticking
    // on the first. (Within the timeout the letters accumulate into a prefix
    // instead — which is what makes a 181-entry score list usable.)
    const anchor = state.anchor >= 0 ? state.anchor : selectedIndex;
    const i = resolveTypeahead(state, char, options, anchor + 1);
    if (i < 0) return;
    if (!open) openMenu(i);
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
        return;
      }
    } else {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          move(1);
          return;
        case 'ArrowUp':
          e.preventDefault();
          move(-1);
          return;
        case 'Home':
          e.preventDefault();
          setActive(firstEnabled(0, 1));
          return;
        case 'End':
          e.preventDefault();
          setActive(firstEnabled(options.length - 1, -1));
          return;
        case 'Enter':
        case ' ':
          e.preventDefault();
          commit(activeIndex);
          return;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          return;
        case 'Tab':
          // Let focus move on, but never commit — Tab is "leave", not "choose".
          setOpen(false);
          return;
        default:
          break;
      }
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      jumpByPrefix(e.key);
    }
  };

  /* --- render ------------------------------------------------------------- */

  const triggerClasses = [
    'm3-select-trigger',
    'm3-state-layer',
    SIZE_CLASS[size],
    open ? 'm3-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-labelledby={ariaLabelledBy}
            aria-label={ariaLabelledBy ? undefined : ariaLabel}
            className={`m3-select-menu ${pos?.up ? 'm3-up' : ''}`}
            style={{
              left: pos?.left ?? 0,
              top: pos?.top,
              bottom: pos?.bottom,
              width: pos?.width,
              minWidth: pos?.minWidth,
              maxHeight: pos?.maxHeight ?? MENU_MAX_HEIGHT,
              // Hidden for the single frame between mount and measurement, so
              // the list never flashes at the top-left corner of the viewport.
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {options.length === 0 && <li className="m3-select-empty">{emptyLabel}</li>}
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={`${String(o.value)}-${i}`}
                  id={`${baseId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  className={[
                    'm3-select-option',
                    i === activeIndex ? 'm3-active' : '',
                    isSelected ? 'm3-selected' : '',
                    o.disabled ? 'm3-disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onClick={() => commit(i)}
                >
                  {o.icon}
                  <span className="m3-select-option-label">{o.label}</span>
                  {isSelected && <Check size={16} className="m3-select-check" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={baseId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        className={triggerClasses}
        style={inline ? { width: 'auto' } : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={`m3-select-value ${selected ? '' : 'm3-placeholder'}`}>
          {selected ? selected.label : placeholder ?? ''}
        </span>
        <ChevronDown
          size={ARROW_SIZE[size]}
          className={`m3-select-arrow m3-chevron ${open ? 'm3-open' : ''}`}
          aria-hidden="true"
        />
      </button>
      {/* Keeps the control usable inside a plain HTML form post. */}
      {name && <input type="hidden" name={name} value={selected == null ? '' : String(selected.value)} />}
      {menu}
    </>
  );
}

export default Select;
