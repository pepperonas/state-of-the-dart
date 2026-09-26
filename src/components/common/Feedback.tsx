import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FeedbackContext, type ConfirmOptions } from './feedbackContext';
import { useTranslation } from 'react-i18next';
import Snackbar from './Snackbar';
import Dialog from './Dialog';
import Button from './Button';

/**
 * App-wide feedback. The app had 36 `alert()`/`confirm()` calls: browser-drawn
 * boxes that ignore the theme, block the page and — for most of them — spoke
 * German regardless of the language setting.
 */
export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const notify = useCallback((text: string) => setMessage(text), []);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    resolveRef.current?.(false); // a second request cancels an unanswered first one
    resolveRef.current = resolve;
    setPending(options);
  }), []);

  const answer = (ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setPending(null);
  };

  const api = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <Snackbar open={message !== null} message={message ?? ''} onClose={() => setMessage(null)} duration={5000} />
      <Dialog
        open={pending !== null}
        onClose={() => answer(false)}
        title={pending?.title}
        hideClose
        widthClassName="max-w-sm"
        actions={
          <>
            <Button variant="text" onClick={() => answer(false)}>{pending?.cancelLabel ?? t('common.cancel')}</Button>
            <Button variant={pending?.danger ? 'danger' : 'filled'} onClick={() => answer(true)}>
              {pending?.confirmLabel ?? t('common.confirm')}
            </Button>
          </>
        }
      >
        {pending?.message && <p className="text-on-surface-variant whitespace-pre-line">{pending.message}</p>}
      </Dialog>
    </FeedbackContext.Provider>
  );
};

