import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingIndicatorProps {
  size?: number;
  /** Visible label under the shape; the accessible label is always set. */
  label?: string;
  className?: string;
}

/**
 * M3 Expressive loading indicator: a filled shape that morphs through rounded
 * forms while it turns. One component instead of the six spinner styles the
 * app had (border spinners, two lucide loaders, a "Loading..." glass card).
 * With reduced motion it holds still — the label still says what is going on.
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ size = 48, label, className = '' }) => {
  const { t } = useTranslation();
  const text = label ?? t('common.loading');
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center gap-3 ${className}`}>
      <span
        aria-hidden="true"
        className="m3-loading-indicator"
        style={{ width: size, height: size }}
      />
      {label !== undefined ? (
        <span className="m3-body-medium text-on-surface-variant">{text}</span>
      ) : (
        <span className="sr-only">{text}</span>
      )}
    </div>
  );
};

export default LoadingIndicator;
