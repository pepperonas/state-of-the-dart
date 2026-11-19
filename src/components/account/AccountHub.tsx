import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Settings, CreditCard, BookOpen, Keyboard, Mail, Bug, Shield, LogOut, ChevronRight, Crown, Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PageShell from '../common/PageShell';
import Button from '../common/Button';
import UserGuideModal from '../guide/UserGuideModal';
import ContactModal from '../contact/ContactModal';
import BugReportModal from '../bugReport/BugReportModal';
import { openShortcuts } from '../../utils/shortcuts';

type Row = {
  id: string;
  icon: typeof User;
  label: string;
  description: string;
  onSelect: () => void;
};

/**
 * The account destination (0.47.0): everything about the person and the app
 * in one place, one tap from every screen.
 *
 * It replaces the dropdown behind the initial in the home header — that menu
 * existed on the home screen only, said nothing on a phone but a letter, and
 * held the settings, the subscription, the guide and the contact form.
 */
const AccountHub: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, hasActiveSubscription, trialDaysLeft } = useAuth();
  const [guide, setGuide] = useState(false);
  const [contact, setContact] = useState(false);
  const [bug, setBug] = useState(false);
  if (!user) return null;

  const status = user.subscriptionStatus;
  const plan =
    status === 'lifetime' ? t('account_hub.plan_lifetime')
      : hasActiveSubscription && status !== 'trial' ? t('account_hub.plan_active')
        : status === 'trial' && trialDaysLeft > 0 ? t('account_hub.plan_trial', { count: trialDaysLeft })
          : t('account_hub.plan_none');

  const groups: Array<{ id: string; title: string; rows: Row[] }> = [
    {
      id: 'account',
      title: t('account_hub.group_account'),
      rows: [
        { id: 'profile', icon: User, label: t('account_hub.profile'), description: t('account_hub.profile_desc'), onSelect: () => navigate('/account') },
        { id: 'plan', icon: CreditCard, label: t('account_hub.subscription'), description: plan, onSelect: () => navigate('/pricing') },
      ],
    },
    {
      id: 'app',
      title: t('account_hub.group_app'),
      rows: [
        { id: 'settings', icon: Settings, label: t('account_hub.settings'), description: t('account_hub.settings_desc'), onSelect: () => navigate('/settings') },
      ],
    },
    {
      id: 'help',
      title: t('account_hub.group_help'),
      rows: [
        { id: 'guide', icon: BookOpen, label: t('account_hub.guide'), description: t('account_hub.guide_desc'), onSelect: () => setGuide(true) },
        { id: 'shortcuts', icon: Keyboard, label: t('account_hub.shortcuts'), description: t('account_hub.shortcuts_desc'), onSelect: openShortcuts },
        { id: 'contact', icon: Mail, label: t('account_hub.contact'), description: t('account_hub.contact_desc'), onSelect: () => setContact(true) },
        { id: 'bug', icon: Bug, label: t('account_hub.bug'), description: t('account_hub.bug_desc'), onSelect: () => setBug(true) },
      ],
    },
    ...(user.isAdmin
      ? [{
          id: 'admin',
          title: t('account_hub.group_admin'),
          rows: [{ id: 'admin', icon: Shield, label: t('account_hub.admin'), description: t('account_hub.admin_desc'), onSelect: () => navigate('/admin') }],
        }]
      : []),
  ];

  return (
    <PageShell title={t('account_hub.title')} width="md" back={false}>
      {/* Who is signed in, and what they have. */}
      <section
        aria-label={t('account_hub.summary')}
        data-testid="account-summary"
        className="flex flex-wrap items-center gap-4 p-5 mb-6 rounded-m3-xl bg-surface-container-high"
      >
        <span
          aria-hidden="true"
          className="shrink-0 w-14 h-14 rounded-m3-full bg-primary text-on-primary grid place-items-center m3-headline-medium"
        >
          {user.name.charAt(0).toUpperCase()}
        </span>
        {/* basis 12rem: on a phone the upgrade button wraps to its own row instead of squeezing the name. */}
        <span className="min-w-0 flex-1 basis-48">
          <span className="block m3-title-large text-on-surface truncate">{user.name}</span>
          <span className="block m3-body-medium text-on-surface-variant truncate">{user.email}</span>
          <span className="mt-1 inline-flex items-center gap-1.5 m3-label-large text-primary">
            {status === 'lifetime' ? <Crown size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
            {plan}
          </span>
        </span>
        {status === 'trial' && (
          <div className="w-full sm:w-auto">
            <Button variant="filled" fullWidth icon={<Crown size={18} />} onClick={() => navigate('/pricing')}>
              {t('account_hub.upgrade')}
            </Button>
          </div>
        )}
      </section>

      {groups.map(g => (
        <section key={g.id} aria-labelledby={`account-group-${g.id}`} className="mb-6">
          <h2 id={`account-group-${g.id}`} className="m3-title-medium text-on-surface-variant mb-2 px-1">{g.title}</h2>
          <ul className="rounded-m3-xl bg-surface-container overflow-hidden divide-y divide-outline-variant">
            {g.rows.map(r => (
              <li key={r.id}>
                <button
                  type="button"
                  data-testid={`account-row-${r.id}`}
                  onClick={r.onSelect}
                  className="m3-state-layer w-full flex items-center gap-4 min-h-[64px] px-4 py-3 text-left text-on-surface"
                >
                  <span className="shrink-0 w-10 h-10 rounded-m3-md bg-secondary-container text-on-secondary-container grid place-items-center">
                    <r.icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block m3-title-medium">{r.label}</span>
                    <span className="block m3-body-medium text-on-surface-variant">{r.description}</span>
                  </span>
                  <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-on-surface-variant" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Button
        variant="outlined"
        fullWidth
        icon={<LogOut size={18} />}
        onClick={() => { logout(); navigate('/login'); }}
      >
        {t('auth.logout')}
      </Button>

      {guide && <UserGuideModal onClose={() => setGuide(false)} />}
      {contact && <ContactModal onClose={() => setContact(false)} />}
      {bug && <BugReportModal onClose={() => setBug(false)} currentRoute={window.location.pathname} />}
    </PageShell>
  );
};

export default AccountHub;
