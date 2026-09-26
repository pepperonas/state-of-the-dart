import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import DebugFlagModal from './DebugFlagModal';

const DebugFlagButton: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Only visible to admins
  if (!user?.isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 left-[4.5rem] md:bottom-4 md:left-[9.5rem] z-30 w-12 h-12 rounded-m3-full bg-tertiary-container text-tertiary shadow-m3-3 hover:shadow-m3-4 flex items-center justify-center transition-all m3-enter-pop m3-ripple m3-state-layer"
        title={t('debug_button.label')}
        aria-label={t('debug_button.label')}
      >
        <Flag size={18} />
      </button>
      {showModal && <DebugFlagModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default DebugFlagButton;
