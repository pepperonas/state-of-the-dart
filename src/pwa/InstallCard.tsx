import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from './installPrompt';
import { Button, Card } from '../components/common';

export const FINISHED_MATCH_KEY = 'sotd-finished-a-match';
const DISMISSED_KEY = 'sotd-install-dismissed';

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };

/**
 * Offers installing the app — after the first finished match, when the user
 * has seen what they would be installing. Never while it is already installed,
 * and "later" is remembered.
 */
const InstallCard: React.FC = () => {
  const { t } = useTranslation();
  const { canPrompt, needsManualInstall, promptInstall } = useInstallPrompt();
  const [hidden, setHidden] = useState(() => read(DISMISSED_KEY) === '1');

  if (hidden || read(FINISHED_MATCH_KEY) !== '1' || (!canPrompt && !needsManualInstall)) return null;

  const dismiss = () => { write(DISMISSED_KEY, '1'); setHidden(true); };

  return (
    <Card variant="filled" className="mb-6 p-4 flex items-start gap-4 bg-primary-container text-on-primary-container">
      <Smartphone size={28} aria-hidden="true" className="shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <p className="m3-title-medium">{t('pwa.install_title')}</p>
        <p className="m3-body-medium mt-1">{needsManualInstall ? t('pwa.install_ios') : t('pwa.install_body')}</p>
        {canPrompt && (
          <div className="mt-3 flex gap-2">
            <Button variant="filled" size="sm" onClick={async () => { await promptInstall(); dismiss(); }}>
              {t('pwa.install_action')}
            </Button>
            <Button variant="text" size="sm" onClick={dismiss}>{t('pwa.install_later')}</Button>
          </div>
        )}
      </div>
      {needsManualInstall && (
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={dismiss}
          className="m3-state-layer rounded-m3-full w-12 h-12 grid place-items-center -mr-2 -mt-2"
        >
          <X size={20} />
        </button>
      )}
    </Card>
  );
};

export default InstallCard;
