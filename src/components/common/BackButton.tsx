import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BackButtonProps {
  onClick: () => void;
  /** Override the default "common.back" label */
  label?: string;
  /** Append extra utility classes (e.g. positioning). The button's visual style
   *  is fixed; only layout-related additions should go here. */
  className?: string;
  /** Render as inline-flex for centered layouts. Default is block-level. */
  inline?: boolean;
}

const BASE_CLASSES =
  'flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all';

/**
 * Canonical back button. Style is fixed across the app per the convention
 * documented in CLAUDE.md ("Back buttons: glass-card style with
 * <ArrowLeft size={20} /> and t('common.back')").
 */
const BackButton: React.FC<BackButtonProps> = ({ onClick, label, className = '', inline = false }) => {
  const { t } = useTranslation();
  const classes = [
    BASE_CLASSES,
    inline ? 'inline-flex w-fit' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button onClick={onClick} className={classes}>
      <ArrowLeft size={20} />
      {label ?? t('common.back')}
    </button>
  );
};

export default BackButton;
