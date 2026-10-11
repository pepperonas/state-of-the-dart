import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dialogMotion, effectsDefault, springStandardDefault } from '../../utils/motion';
import IconButton from './IconButton';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Footer action row (buttons). */
  actions?: React.ReactNode;
  /** Hide the top-right close button. */
  hideClose?: boolean;
  /** Override max-width (Tailwind class), e.g. "max-w-lg". */
  widthClassName?: string;
  /** Scrim click does not close (winner screens, forms with unsaved input). */
  persistent?: boolean;
  /** Accessible name when the dialog draws its own header instead of `title`. */
  ariaLabel?: string;
  /** `sheet`: a bottom sheet (phones) — docked at the bottom, slides up, drag down to close. */
  variant?: 'dialog' | 'sheet';
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Material 3 Expressive dialog. Scrim + spring-animated container (28px corners,
 * surface-container-high).
 *
 * Behaves like a modal should: focus moves into the dialog, Tab stays inside,
 * Escape closes, and focus returns to whatever opened it. It is labelled by its
 * title. (It used to do none of the focus work, and "Close" was hardcoded.)
 */
const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  actions,
  hideClose = false,
  widthClassName,
  persistent = false,
  ariaLabel,
  variant = 'dialog',
  children,
}) => {
  const sheet = variant === 'sheet';
  // Only the handle starts a drag — the sheet's content must still scroll.
  const dragControls = useDragControls();
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;

    // Initial focus: the first field or action inside the dialog, else the panel.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector<HTMLElement>('[autofocus], input, textarea') ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel).focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => !el.closest('[hidden], [aria-hidden="true"], [inert]'));
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      // Give focus back to the control that opened the dialog.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={sheet ? 'm3-scrim m3-scrim-sheet' : 'm3-scrim'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={effectsDefault}
          onClick={persistent ? undefined : onClose}
          data-backdrop
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={[sheet ? 'm3-sheet' : 'm3-dialog', 'outline-none', widthClassName].filter(Boolean).join(' ')}
            initial={sheet ? { y: '100%' } : dialogMotion.initial}
            animate={sheet ? { y: 0 } : dialogMotion.animate}
            exit={sheet ? { y: '100%' } : dialogMotion.exit}
            transition={sheet ? springStandardDefault : dialogMotion.transition}
            // A sheet follows the finger down and closes past a threshold.
            drag={sheet ? 'y' : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={sheet ? (_e, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); } : undefined}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : ariaLabel}
          >
            {sheet && (
              <div
                aria-hidden="true"
                data-testid="sheet-handle"
                onPointerDown={(e) => dragControls.start(e)}
                className="-mt-1 mb-2 flex justify-center py-2 cursor-grab touch-none"
              >
                <span className="h-1 w-9 rounded-m3-full bg-[var(--m3-on-surface-variant)]" />
              </div>
            )}
            {(title || !hideClose) && (
              <div className="flex items-center justify-between mb-4 gap-3">
                {title ? <h2 id={titleId} className="m3-headline-small">{title}</h2> : <span />}
                {!hideClose && (
                  <IconButton label={t('common.close')} onClick={onClose} className="-mr-2">
                    <X size={20} />
                  </IconButton>
                )}
              </div>
            )}
            {children}
            {actions && <div className="flex flex-wrap items-center justify-end gap-2 mt-6">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Dialog;
