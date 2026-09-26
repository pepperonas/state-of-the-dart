import { useEffect, useState } from 'react';

/**
 * The browser's install offer, captured once for the whole app.
 *
 * `beforeinstallprompt` fires once, early, on whatever page the user is on.
 * It used to be caught only inside Settings — so unless the user happened to
 * be on the settings page at that moment, the offer was simply lost.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export const isStandalone = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** iOS never fires beforeinstallprompt: installing is a manual Share-sheet step. */
export const isIOS = (): boolean =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** Call once at startup, before React renders. */
export const captureInstallPrompt = (): void => {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault(); // keep the mini-infobar away; we offer it at a good moment
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
};

/** Shows the browser's install dialog. Resolves to whether the user accepted. */
export const promptInstall = async (): Promise<boolean> => {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // the event can only be used once
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
};

export const useInstallPrompt = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const standalone = installed || isStandalone();
  return {
    installed: standalone,
    canPrompt: !standalone && deferred !== null,
    /** iOS Safari, not installed: can only be installed by hand. */
    needsManualInstall: !standalone && deferred === null && isIOS(),
    promptInstall,
  };
};

/** Test hook. */
export const __resetInstallPrompt = () => { deferred = null; installed = false; notify(); };
