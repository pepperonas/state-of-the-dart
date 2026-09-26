/** Test stand-in for vite-plugin-pwa's virtual module (only exists in Vite builds). */
import { useState } from 'react';

export const pwaStub = { needRefresh: false, update: (_reload?: boolean) => {} };

export const useRegisterSW = () => {
  const needRefresh = useState(pwaStub.needRefresh);
  const offlineReady = useState(false);
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async (reload?: boolean) => pwaStub.update(reload),
  };
};
