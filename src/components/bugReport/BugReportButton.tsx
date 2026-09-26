import React, { useState } from 'react';
import { Bug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Fab from '../common/Fab';
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
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <>
      <Fab
        size="sm"
        color="secondary"
        icon={<Bug size={18} />}
        ariaLabel={t('bug_button.label')}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 md:bottom-4 md:left-24 z-30 m3-enter-pop"
      />
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
