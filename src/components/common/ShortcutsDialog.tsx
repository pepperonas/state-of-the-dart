import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from './Dialog';
import { shouldHandleGameKey } from '../../utils/gameKeys';

/** Keys and what they do. Keys are not translated; descriptions are. */
const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['0–9'], action: 'type' },
  { keys: ['Enter'], action: 'confirm' },
  { keys: ['Backspace'], action: 'back' },
  { keys: ['Ctrl', 'Z'], action: 'undo' },
  { keys: ['Esc'], action: 'clear' },
  { keys: ['?'], action: 'help' },
];

/**
 * Global "?" overlay listing the keyboard shortcuts. The game keys were only
 * explained in a one-line hint under the numpad, which a keyboard or screen
 * reader user had to find first.
 */
const ShortcutsDialog: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || !shouldHandleGameKey(e)) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title={t('shortcuts.title')} widthClassName="max-w-md">
      <p className="m3-body-medium text-on-surface-variant mb-4">{t('shortcuts.intro')}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center">
        {SHORTCUTS.map(s => (
          <React.Fragment key={s.action}>
            <dt className="flex gap-1">
              {s.keys.map(k => (
                <kbd key={k} className="m3-label-large px-2 py-1 rounded-m3-xs bg-surface-container-highest text-on-surface border border-outline-variant">{k}</kbd>
              ))}
            </dt>
            <dd className="m3-body-medium text-on-surface">{t(`shortcuts.${s.action}`)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </Dialog>
  );
};

export default ShortcutsDialog;
