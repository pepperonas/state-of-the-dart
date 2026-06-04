import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
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
  children: React.ReactNode;
}

/**
 * Material 3 Expressive dialog. Scrim + spring-animated container (28px corners,
 * surface-container-high). Closes on scrim click and Escape.
 */
const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  actions,
  hideClose = false,
  widthClassName,
  children,
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="m3-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={effectsDefault}
          onClick={onClose}
        >
          <motion.div
            className={['m3-dialog', widthClassName].filter(Boolean).join(' ')}
            initial={dialogMotion.initial}
            animate={dialogMotion.animate}
            exit={dialogMotion.exit}
            transition={dialogMotion.transition}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {(title || !hideClose) && (
              <div className="flex items-center justify-between mb-4 gap-3">
                {title ? <h2 className="m3-headline-small">{title}</h2> : <span />}
                {!hideClose && (
                  <IconButton label="Close" onClick={onClose} className="-mr-2">
                    <X size={20} />
                  </IconButton>
                )}
              </div>
            )}
            {children}
            {actions && <div className="flex items-center justify-end gap-2 mt-6">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Dialog;
