import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { isGameRoute } from '../utils/gameRoutes';
import { springSpatialDefault } from '../utils/motion';

/** Caches the service worker used to keep for API responses (see vite.config). */
const RETIRED_CACHES = ['api-players-cache', 'api-matches-cache', 'api-settings-cache'];

/**
 * Registers the service worker and offers a new version as an M3 snackbar.
 *
 * The app shipped a service worker for months that nothing ever registered —
 * no offline support, no updates. With `registerType: 'prompt'` a new version
 * waits; the offer is held back while a game is on screen, because reloading
 * mid-visit would throw the darts in the input away.
 */
const UpdatePrompt: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: error => console.warn('[pwa] service worker registration failed', error),
  });

  useEffect(() => {
    if (!('caches' in window)) return;
    RETIRED_CACHES.forEach(name => { caches.delete(name).catch(() => {}); });
  }, []);

  const visible = needRefresh && !dismissed && !isGameRoute(pathname);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={springSpatialDefault}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,28rem)] flex items-center gap-3 rounded-m3-md bg-[var(--m3-inverse-surface)] text-[var(--m3-inverse-on-surface)] shadow-m3-3 pl-4 pr-2 py-2"
        >
          <RefreshCw size={18} aria-hidden="true" className="shrink-0" />
          <span className="m3-body-medium flex-1">{t('pwa.update_available')}</span>
          {/* M3 snackbar: the action uses inverse-primary — the regular primary
              would sit light-on-light on the inverse surface in the dark theme. */}
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="m3-state-layer m3-label-large rounded-m3-full px-3 min-h-[40px] text-[var(--m3-inverse-primary)]"
          >
            {t('pwa.reload')}
          </button>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setDismissed(true)}
            className="m3-state-layer rounded-m3-full w-10 h-10 grid place-items-center"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdatePrompt;
