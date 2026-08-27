import React, { useState } from 'react';
import { Bug } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BugReportModal from './BugReportModal';

/**
 * Floating "report a bug" button for every signed-in user.
 *
 * Reporting was already open to all registered users — `POST /api/bug-reports`
 * only requires `authenticateToken`, and non-admins are scoped to their own
 * reports on read. What was missing was a way to *find* it: the entry point
 * lived inside a collapsed section of Settings, while the admin-only debug flag
 * had a permanent button on every screen. This gives the two the same footing.
 *
 * Sits beside `DebugFlagButton`, which stays admin-only.
 */
const BugReportButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 w-10 h-10 rounded-m3-full bg-secondary-container text-on-secondary-container shadow-m3-3 hover:shadow-m3-4 flex items-center justify-center transition-all m3-enter-pop m3-ripple m3-state-layer"
        title="Bug melden"
        aria-label="Bug melden"
      >
        <Bug size={18} />
      </button>
      {open && (
        <BugReportModal
          onClose={() => setOpen(false)}
          currentRoute={window.location.pathname}
        />
      )}
    </>
  );
};

export default BugReportButton;
