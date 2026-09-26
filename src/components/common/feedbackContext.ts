import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
}

export interface FeedbackApi {
  /** A short message in an M3 snackbar (replaces window.alert). */
  notify: (message: string) => void;
  /** An M3 dialog that resolves to the user's answer (replaces window.confirm). */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const FeedbackContext = createContext<FeedbackApi | null>(null);

export const useFeedback = (): FeedbackApi => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
};
