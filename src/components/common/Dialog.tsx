import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dialogMotion, effectsDefault } from '../../utils/motion';
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
  children,
}) => {
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
          className="m3-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={effectsDefault}
          onClick={persistent ? undefined : onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={['m3-dialog outline-none', widthClassName].filter(Boolean).join(' ')}
            initial={dialogMotion.initial}
            animate={dialogMotion.animate}
            exit={dialogMotion.exit}
            transition={dialogMotion.transition}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
          >
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
