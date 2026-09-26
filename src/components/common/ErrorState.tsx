import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudOff, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  /** What failed, in the user's words. Defaults to a generic load message. */
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * "Could not load — try again." Screens used to swallow load errors and render
 * an empty list, so a network hiccup read as "you have no matches".
 */
const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, className = '' }) => {
  const { t } = useTranslation();
  return (
    <div role="alert" className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-m3-lg bg-error-container text-on-error-container ${className}`}>
      <CloudOff size={24} aria-hidden="true" className="shrink-0" />
      <p className="m3-body-large flex-1">{message ?? t('common.load_failed')}</p>
      {onRetry && (
        <Button variant="tonal" size="sm" icon={<RefreshCw size={16} />} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
