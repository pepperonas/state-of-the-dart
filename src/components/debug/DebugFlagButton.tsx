import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Fab from '../common/Fab';
import DebugFlagModal from './DebugFlagModal';

const DebugFlagButton: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Only visible to admins
  if (!user?.isAdmin) return null;

  return (
    <>
      <Fab
        size="sm"
        color="tertiary"
        icon={<Flag size={18} />}
        ariaLabel={t('debug_button.label')}
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 left-[4.5rem] md:bottom-4 md:left-[9.5rem] z-30 m3-enter-pop"
      />
      {showModal && <DebugFlagModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default DebugFlagButton;
