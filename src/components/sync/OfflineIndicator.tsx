import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import offlineSync from '../../utils/offlineSync';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Setup connectivity listener
    const cleanup = offlineSync.setupConnectivityListener(
      async () => {
        setIsOnline(true);
        setShowBanner(true);
        // Auto-sync when back online
        await handleSync();
        setTimeout(() => setShowBanner(false), 3000);
      },
      () => {
        setIsOnline(false);
        setShowBanner(true);
      }
    );

    // Check pending count periodically
    const checkPending = async () => {
      const count = await offlineSync.getPendingCount();
      setPendingCount(count);
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      // Sync pending actions
      const result = await offlineSync.syncPendingActions(async (action) => {
        // This would normally call the API
        // For now, just return true to clear the queue
        console.log('Syncing action:', action);
        return true;
      });
      
      console.log('Sync result:', result);
      const count = await offlineSync.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Minimal indicator when online
  if (isOnline && pendingCount === 0 && !showBanner) {
    return null;
  }

  return (
    <>
      {/* Status Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 p-3 text-center font-medium ${
              isOnline 
                ? 'bg-green-500 text-white' 
                : 'bg-amber-500 text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isOnline ? (
                <>
                  <Wifi size={18} />
                  <span>Wieder online! Daten werden synchronisiert...</span>
                </>
              ) : (
                <>
                  <WifiOff size={18} />
                  <span>Offline - Änderungen werden lokal gespeichert</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating indicator */}
      {(!isOnline || pendingCount > 0) && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-20 right-4 z-40"
        >
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
              isOnline 
                ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                : 'bg-amber-500 text-white'
            }`}
          >
            {isSyncing ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : isOnline ? (
              <Cloud size={18} />
            ) : (
              <CloudOff size={18} />
            )}
            
            {pendingCount > 0 && (
              <span className="text-sm font-medium">
                {pendingCount} ausstehend
              </span>
            )}
            
            {!isOnline && pendingCount === 0 && (
              <span className="text-sm font-medium">Offline</span>
            )}
          </button>
        </motion.div>
      )}
    </>
  );
};

export default OfflineIndicator;
