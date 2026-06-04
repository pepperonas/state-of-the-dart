import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button';

interface BackButtonProps {
  onClick: () => void;
  /** Override the default "common.back" label */
  label?: string;
  /** Extra utility classes (applied to the wrapper in block mode, to the button in inline mode). */
  className?: string;
  /**
   * Render the bare button without the default bottom-margin wrapper. Use when
   * the button lives in a flex header row / form / in-game header that already
   * controls spacing. Default (block) mode adds a uniform `mb-6` gap so the
   * distance to the page heading is consistent across all screens.
   */
  inline?: boolean;
}

/**
 * Canonical back button — an M3 tonal button with a leading arrow. In block mode
 * (default) it wraps in a `mb-6` block so the gap to the page heading is uniform
 * app-wide; pass `inline` to opt out for row/header layouts.
 */
const BackButton: React.FC<BackButtonProps> = ({ onClick, label, className = '', inline = false }) => {
  const { t } = useTranslation();

  const button = (
    <Button
      variant="tonal"
      size="sm"
      onClick={onClick}
      className={inline ? className : ''}
      icon={<ArrowLeft size={18} />}
    >
      {label ?? t('common.back')}
    </Button>
  );

  if (inline) return button;
  return <div className={['mb-6', className].filter(Boolean).join(' ')}>{button}</div>;
};

export default BackButton;
