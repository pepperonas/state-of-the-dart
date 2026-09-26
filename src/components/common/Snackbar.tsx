import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { springSpatialDefault } from '../../utils/motion';

export interface SnackbarProps {
  open: boolean;
  message: string;
  /** Optional single action, e.g. "Undo". */
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  /** Auto-dismiss after this many ms (default 8000, 0 = stay). */
  duration?: number;
}

/**
 * M3 snackbar: inverse surface, one optional action in inverse-primary.
 * Announced politely to screen readers.
 */
const Snackbar: React.FC<SnackbarProps> = ({ open, message, actionLabel, onAction, onClose, duration = 8000 }) => {
  useEffect(() => {
    if (!open || !duration) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={springSpatialDefault}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,32rem)] flex items-center gap-3 rounded-m3-md bg-[var(--m3-inverse-surface)] text-[var(--m3-inverse-on-surface)] shadow-m3-3 pl-4 pr-2 py-2"
        >
          <span className="m3-body-medium flex-1">{message}</span>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="m3-state-layer m3-label-large rounded-m3-full px-3 min-h-[40px] text-[var(--m3-inverse-primary)]"
            >
              {actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Snackbar;
