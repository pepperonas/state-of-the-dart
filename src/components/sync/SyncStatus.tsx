import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { syncService, SyncStatus as SyncStatusType } from '../../services/sync';

const SyncStatus: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SyncStatusType>(syncService.getStatus());

  useEffect(() => {
    const unsubscribe = syncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  if (status.syncing) {
    return (
      <div className="flex items-center gap-2 text-tertiary m3-label-medium">
        <RefreshCw className="animate-spin" size={16} />
        <span>{t('sync_status.syncing')}</span>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="flex items-center gap-2 text-error m3-label-medium cursor-pointer hover:opacity-80 transition-opacity m3-breathe"
        title={status.error}
      >
        <CloudOff size={16} />
        <span>{t('sync_status.error')}</span>
      </div>
    );
  }

  if (status.lastSync) {
    const minutes = Math.floor((Date.now() - status.lastSync) / 1000 / 60);
    const timeAgo = minutes < 1 ? t('sync_status.just_now') : t('sync_status.minutes_ago', { count: minutes });

    return (
      <div className="flex items-center gap-2 text-success m3-label-medium m3-enter-fade" title={t('sync_status.last_sync', { time: timeAgo })}>
        <CheckCircle size={16} />
        <span className="hidden sm:inline">{timeAgo}</span>
      </div>
    );
  }

  // Don't show anything if there's no sync yet
  return null;
};

export default SyncStatus;
