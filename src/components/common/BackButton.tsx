import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button';

interface BackButtonProps {
  onClick: () => void;
  /** Override the default "common.back" label */
  label?: string;
  /** Append extra utility classes (e.g. positioning). */
  className?: string;
  /** Retained for API compatibility; M3 back button is already inline-flex. */
  inline?: boolean;
}

/**
 * Canonical back button — now a Material 3 Expressive tonal button with a
 * leading arrow. Style is centralised here per the CLAUDE.md convention; pass
 * `label` for custom text.
 */
const BackButton: React.FC<BackButtonProps> = ({ onClick, label, className = '' }) => {
  const { t } = useTranslation();
  return (
    <Button variant="tonal" size="sm" onClick={onClick} className={className} icon={<ArrowLeft size={18} />}>
      {label ?? t('common.back')}
    </Button>
  );
};

export default BackButton;
