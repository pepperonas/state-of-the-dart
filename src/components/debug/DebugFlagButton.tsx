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
        className="fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full bg-amber-500/30 hover:bg-amber-500/50 backdrop-blur-sm border border-amber-500/30 flex items-center justify-center transition-all"
        title="Debug Flag"
      >
        <Flag size={18} className="text-amber-400" />
      </button>
      {showModal && <DebugFlagModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default DebugFlagButton;
