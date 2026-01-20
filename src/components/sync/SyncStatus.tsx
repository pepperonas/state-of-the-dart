import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { syncService, SyncStatus as SyncStatusType } from '../../services/sync';

const SyncStatus: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusType>(syncService.getStatus());

  useEffect(() => {
    const unsubscribe = syncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  if (status.syncing) {
    return (
      <div className="flex items-center gap-2 text-primary-400 text-sm">
        <RefreshCw className="animate-spin" size={16} />
        <span>Synchronisiere...</span>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="flex items-center gap-2 text-error-400 text-sm cursor-pointer hover:text-error-300 transition-colors"
        title={status.error}
      >
        <CloudOff size={16} />
        <span>Sync Fehler</span>
      </div>
    );
  }

  if (status.lastSync) {
    const minutes = Math.floor((Date.now() - status.lastSync) / 1000 / 60);
    const timeAgo = minutes < 1 ? 'gerade eben' : minutes === 1 ? 'vor 1 Min' : `vor ${minutes} Min`;

    return (
      <div className="flex items-center gap-2 text-success-400 text-sm" title={`Letzter Sync: ${timeAgo}`}>
        <CheckCircle size={16} />
        <span className="hidden sm:inline">{timeAgo}</span>
      </div>
    );
  }

  // Don't show anything if there's no sync yet
  return null;
};

export default SyncStatus;
