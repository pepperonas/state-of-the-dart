import React, { useState } from 'react';
import { Bug, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOptionalAuth } from '../../context/authContextValue';
import IconButton from '../common/IconButton';
import BugReportModal from './BugReportModal';
import DebugFlagModal from '../debug/DebugFlagModal';

interface ReportActionsProps {
  /** `rail`: stacked at the foot of the navigation rail. `header`: in a page's title row. */
  layout: 'rail' | 'header';
  className?: string;
}

/**
 * "Report a bug" (every signed-in user) and "debug flag" (admins) — 0.43.0.
 *
 * They used to be two small FABs fixed to the bottom-left corner. On a phone
 * that corner is content: the buttons sat over player rows and achievement
 * cards on every page. Now they live where navigation lives — at the foot of
 * the rail from tablet width up, and in the title row of a page on phones —
 * so they never cover anything. The opened modal still records the page.
 */
const ReportActions: React.FC<ReportActionsProps> = ({ layout, className = '' }) => {
  const { t } = useTranslation();
  const auth = useOptionalAuth();
  const [bugOpen, setBugOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  if (!auth?.isAuthenticated) return null;

  return (
    <div
      data-testid={`report-actions-${layout}`}
      className={`flex ${layout === 'rail' ? 'flex-col' : 'flex-row'} items-center gap-1 ${className}`}
    >
      <IconButton label={t('bug_button.label')} onClick={() => setBugOpen(true)}>
        <Bug size={20} />
      </IconButton>
      {auth.user?.isAdmin && (
        <IconButton label={t('debug_button.label')} onClick={() => setFlagOpen(true)}>
          <Flag size={20} />
        </IconButton>
      )}
      {bugOpen && <BugReportModal onClose={() => setBugOpen(false)} currentRoute={window.location.pathname} />}
      {flagOpen && <DebugFlagModal onClose={() => setFlagOpen(false)} />}
    </div>
  );
};

export default ReportActions;
