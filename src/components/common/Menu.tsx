import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface MenuItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Emphasised item ("Upgrade") or a destructive one ("Log out"). */
  tone?: 'primary' | 'danger';
}

interface MenuProps {
  /** Accessible name of the menu itself. */
  label: string;
  items: MenuItem[];
  /** Trigger content. */
  children: React.ReactNode;
  /** Classes for the trigger button (defaults to a tonal pill). */
  triggerClassName?: string;
  /** Accessible name for an icon-only trigger. */
  triggerLabel?: string;
  /** Non-interactive content above the items (e.g. the signed-in user). */
  header?: React.ReactNode;
  align?: 'start' | 'end';
  widthClassName?: string;
}

/**
 * Material 3 menu following the WAI-ARIA "menu button" pattern: the trigger
 * opens it (click, Enter, Space, ArrowDown), focus moves to the first item,
 * arrows/Home/End move, Enter/Space choose, Escape closes and hands focus back,
 * Tab leaves. The account menu and the export menu were hand-built dropdowns
 * that only closed on an outside click and had no keyboard support.
 */
const Menu: React.FC<MenuProps> = ({
  label,
  items,
  children,
  triggerClassName,
  triggerLabel,
  header,
  align = 'end',
  widthClassName = 'w-56',
}) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusTarget = useRef<'first' | 'last'>('first');

  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter(i => i >= 0);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Focus an item when opening.
  useEffect(() => {
    if (!open) return;
    const idx = focusTarget.current === 'last' ? enabled[enabled.length - 1] : enabled[0];
    const raf = requestAnimationFrame(() => itemRefs.current[idx ?? 0]?.focus());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Outside click closes (without stealing focus from where the user clicked).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  const move = (from: number, delta: number) => {
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(from);
    const next = enabled[(pos + delta + enabled.length) % enabled.length];
    itemRefs.current[next]?.focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusTarget.current = e.key === 'ArrowUp' ? 'last' : 'first';
      setOpen(true);
    }
  };

  const onItemKey = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(index, 1); break;
      case 'ArrowUp': e.preventDefault(); move(index, -1); break;
      case 'Home': e.preventDefault(); itemRefs.current[enabled[0]]?.focus(); break;
      case 'End': e.preventDefault(); itemRefs.current[enabled[enabled.length - 1]]?.focus(); break;
      case 'Tab': close(false); break;
    }
  };

  const choose = (item: MenuItem) => {
    if (item.disabled) return;
    close();
    item.onSelect();
  };

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      // Escape from the trigger or any item (focus may still be on the trigger
      // for a frame after opening).
      onKeyDown={e => { if (open && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => { focusTarget.current = 'first'; setOpen(o => !o); }}
        onKeyDown={onTriggerKey}
        className={triggerClassName ?? 'm3-button m3-tonal m3-state-layer inline-flex items-center gap-2'}
      >
        {children}
      </button>
      {open && (
        <div
          className={`absolute ${align === 'end' ? 'right-0' : 'left-0'} mt-2 ${widthClassName} z-50 overflow-hidden rounded-m3-sm bg-surface-container-high text-on-surface shadow-m3-2 border border-outline-variant m3-enter-drop`}
        >
          {header}
          <div id={menuId} role="menu" aria-label={label} className="py-2">
            {items.map((item, i) => (
              <button
                key={item.id}
                ref={el => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => choose(item)}
                onKeyDown={e => onItemKey(e, i)}
                className={`w-full min-h-12 px-4 py-2 text-left flex items-center gap-3 m3-body-large m3-state-layer focus-visible:outline-none focus-visible:bg-surface-container-highest ${
                  item.tone === 'primary' ? 'text-primary font-semibold' : item.tone === 'danger' ? 'text-error' : 'text-on-surface'
                } ${item.disabled ? 'text-on-surface-variant cursor-not-allowed' : ''}`}
              >
                {item.icon && <span className="shrink-0 text-on-surface-variant" aria-hidden="true">{item.icon}</span>}
                <span className="flex-1 min-w-0 truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
