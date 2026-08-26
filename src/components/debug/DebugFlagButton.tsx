import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DebugFlagModal from './DebugFlagModal';

const DebugFlagButton: React.FC = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Only visible to admins
  if (!user?.isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 left-4 z-40 w-10 h-10 rounded-m3-full bg-tertiary-container text-tertiary shadow-m3-3 hover:shadow-m3-4 flex items-center justify-center transition-all m3-enter-pop m3-ripple m3-state-layer"
        title="Debug Flag"
      >
        <Flag size={18} />
      </button>
      {showModal && <DebugFlagModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default DebugFlagButton;
