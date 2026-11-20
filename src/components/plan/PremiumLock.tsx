import React from 'react';
import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';

/** The small "Premium" mark on something a free account cannot use (0.49.0). */
const PremiumLock: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
    <span
      data-testid="premium-lock"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-m3-full bg-tertiary-container text-on-tertiary-container m3-label-small shrink-0 ${className}`}
    >
      <Crown size={12} aria-hidden="true" />
      {t('plan.premium')}
    </span>
  );
};

export default PremiumLock;
