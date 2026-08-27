import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Crown, Zap, Clock, XCircle, Shield, Trash2, AlertCircle, Eye, Edit, CheckCircle, Copy, ChevronDown, Flag, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { BugReport } from '../../types';
import type { DebugFlag } from '../../types/debugFlag';
import { formatDebugFlagForAI } from '../../utils/debugExport';
import { BackButton, Button, Card, Chip, IconButton, Dialog, Select } from '../common';
import ActivitySparkline from './ActivitySparkline';
import { relativeTime, recencyOf } from '../../utils/activity';
import { reporterOptions, filterByReporter } from '../../utils/reporters';
import { staggerChild } from '../../utils/motion';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  email_verified: number;
  is_admin: number;
  subscription_status: string;
  subscription_plan?: string;
  trial_ends_at?: number;
  subscription_ends_at?: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: number;
  last_active: number;
  /** Usage, admin-only — see `collectUsageByUser` in server/src/routes/admin.ts. */
  match_count?: number;
  training_count?: number;
  usage_count?: number;
  /** One count per day, oldest first. */
  activity?: number[];
  activity_days?: number;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  lifetimeSubscriptions: number;
  trialUsers: number;
  expiredUsers: number;
}

const AdminPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Bug Reports
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [bugFilter, setBugFilter] = useState<string>('all');
  const [bugSeverityFilter, setBugSeverityFilter] = useState<string>('all');
  const [bugUserFilter, setBugUserFilter] = useState<string>('all');

  const [selectedBugReport, setSelectedBugReport] = useState<BugReport | null>(null);
  const [bugLoading, setBugLoading] = useState(false);
  const [bugReportsOpen, setBugReportsOpen] = useState(false);

  // Debug Flags
  const [debugFlags, setDebugFlags] = useState<DebugFlag[]>([]);
  const [debugFilter, setDebugFilter] = useState<string>('all');
  const [debugUserFilter, setDebugUserFilter] = useState<string>('all');
  const [selectedDebugFlag, setSelectedDebugFlag] = useState<DebugFlag | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugFlagsOpen, setDebugFlagsOpen] = useState(false);
  const [copiedFlagId, setCopiedFlagId] = useState<string | null>(null);

  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  // Subscription Edit Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    subscriptionStatus: '',
    subscriptionPlan: '',
    subscriptionEndsAt: '',
  });

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadData();
    loadBugReports();
    loadDebugFlags();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        api.admin.getUsers(),
        api.admin.getStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadBugReports = async () => {
    setBugLoading(true);
    try {
      const reports = await api.bugReports.getAll();
      setBugReports(reports);
    } catch (err: any) {
      console.error('Failed to load bug reports:', err);
    } finally {
      setBugLoading(false);
    }
  };

  const loadDebugFlags = async () => {
    setDebugLoading(true);
    try {
      const flags = await api.debugFlags.getAll();
      setDebugFlags(flags);
    } catch (err: any) {
      console.error('Failed to load debug flags:', err);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleUpdateDebugStatus = async (flagId: string, newStatus: string) => {
    setDebugFlags(prev => prev.map(f => f.id === flagId ? { ...f, status: newStatus as DebugFlag['status'] } : f));
    if (selectedDebugFlag?.id === flagId) {
      setSelectedDebugFlag(prev => prev ? { ...prev, status: newStatus as DebugFlag['status'] } : null);
    }
    try {
      await api.debugFlags.updateStatus(flagId, newStatus);
    } catch (err: any) {
      await loadDebugFlags();
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleUpdateDebugNotes = async (flagId: string, notes: string) => {
    try {
      await api.debugFlags.updateNotes(flagId, notes);
      await loadDebugFlags();
    } catch (err: any) {
      alert('Failed to update notes: ' + err.message);
    }
  };

  const handleDeleteDebugFlag = async (flagId: string) => {
    if (!confirm(t('debug.confirm_delete'))) return;
    try {
      await api.debugFlags.delete(flagId);
      await loadDebugFlags();
      setSelectedDebugFlag(null);
    } catch (err: any) {
      alert('Failed to delete debug flag: ' + err.message);
    }
  };

  const handleCopyForAI = (flag: DebugFlag) => {
    const text = formatDebugFlagForAI(flag);
    navigator.clipboard.writeText(text);
    setCopiedFlagId(flag.id);
    setTimeout(() => setCopiedFlagId(null), 2000);
  };

  const handleUpdateBugStatus = async (reportId: string, newStatus: string) => {
    // Optimistic update: change status locally to avoid list jumping
    setBugReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus as BugReport['status'] } : r));
    if (selectedBugReport?.id === reportId) {
      setSelectedBugReport(prev => prev ? { ...prev, status: newStatus as BugReport['status'] } : null);
    }
    try {
      await api.bugReports.updateStatus(reportId, newStatus);
    } catch (err: any) {
      // Revert on failure
      await loadBugReports();
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleUpdateBugNotes = async (reportId: string, notes: string) => {
    try {
      await api.bugReports.updateNotes(reportId, notes);
      await loadBugReports();
    } catch (err: any) {
      alert('Failed to update notes: ' + err.message);
    }
  };

  const handleDeleteBugReport = async (reportId: string) => {
    if (!confirm(t('admin.confirm_delete_bug'))) return;

    try {
      await api.bugReports.delete(reportId);
      await loadBugReports();
      setSelectedBugReport(null);
    } catch (err: any) {
      alert('Failed to delete bug report: ' + err.message);
    }
  };

  const handleGrantLifetime = async (userId: string) => {
    if (!confirm(t('admin.confirm_grant_lifetime'))) return;
    
    try {
      await api.admin.grantLifetime(userId);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!confirm(t('admin.confirm_revoke_access'))) return;
    
    try {
      await api.admin.revokeAccess(userId);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('admin.confirm_delete_user'))) return;
    
    try {
      await api.admin.deleteUser(userId);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditFormData({
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan || '',
      subscriptionEndsAt: user.subscription_ends_at ? new Date(user.subscription_ends_at).toISOString().slice(0, 16) : '',
    });
  };

  const handleUpdateSubscription = async () => {
    if (!editingUser) return;

    // Validate: lifetime should not have an end date
    if (editFormData.subscriptionStatus === 'lifetime' && editFormData.subscriptionEndsAt) {
      alert(t('admin.error_lifetime_with_end_date', 'Lifetime subscriptions should not have an end date.'));
      return;
    }

    // Validate: end date should be in the future (if provided)
    if (editFormData.subscriptionEndsAt && new Date(editFormData.subscriptionEndsAt) < new Date()) {
      alert(t('admin.error_past_end_date', 'End date must be in the future.'));
      return;
    }

    try {
      await api.admin.updateSubscription(editingUser.id, {
        subscriptionStatus: editFormData.subscriptionStatus,
        subscriptionPlan: editFormData.subscriptionPlan || undefined,
        subscriptionEndsAt: editFormData.subscriptionEndsAt ? new Date(editFormData.subscriptionEndsAt).getTime() : undefined,
      });
      await loadData();
      setEditingUser(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  /**
   * Status badges on the M3 colour roles instead of fixed gradients with white
   * text. The gradients ignored the theme; on the light theme they were white
   * on a light wash. The `*-container` pairs carry their own legible on-colour.
   */
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'lifetime':
        return 'bg-tertiary-container text-on-tertiary-container';
      case 'active':
        return 'bg-success-container text-on-success-container';
      case 'trial':
        return 'bg-primary-container text-on-primary-container';
      case 'expired':
        return 'bg-error-container text-on-error-container';
      default:
        return 'bg-surface-container-highest text-on-surface-variant';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredUsers = users.filter((u) => {
    if (filter === 'all') return true;
    return u.subscription_status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-500 mx-auto mb-4"></div>
          <p className="text-on-surface-variant">{t('admin.loading_panel')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh">
        <Card variant="elevated" className="p-8 text-center">
          <p className="text-error-500 text-xl mb-4">{error}</p>
          <Button variant="filled" onClick={loadData}>
            {t('admin.retry')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <BackButton onClick={() => navigate('/')} />

          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-m3-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
              <Shield size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="m3-headline-medium text-on-surface">{t('admin.admin_panel')}</h1>
              <p className="m3-body-medium text-on-surface-variant">{t('admin.subtitle')}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
          >
            <Card variant="elevated" className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-m3-md bg-primary-container text-on-primary-container">
                  <Users size={20} />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-on-surface">{stats.totalUsers}</p>
              </div>
              <p className="text-on-surface-variant text-sm">{t('admin.total')}</p>
            </Card>
            <Card variant="elevated" className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-m3-md bg-success-container text-on-success-container">
                  <Zap size={20} />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-success-500">{stats.activeSubscriptions}</p>
              </div>
              <p className="text-on-surface-variant text-sm">{t('admin.active_subscriptions')}</p>
            </Card>
            <Card variant="elevated" className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-m3-md bg-tertiary-container text-on-tertiary-container">
                  <Crown size={20} />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-tertiary">{stats.lifetimeSubscriptions}</p>
              </div>
              <p className="text-on-surface-variant text-sm">{t('admin.lifetime')}</p>
            </Card>
            <Card variant="elevated" className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-m3-md bg-secondary-container text-on-secondary-container">
                  <Clock size={20} />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-on-surface">{stats.trialUsers}</p>
              </div>
              <p className="text-on-surface-variant text-sm">{t('admin.trial')}</p>
            </Card>
            <Card variant="elevated" className="p-4 md:p-6 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-m3-md bg-error-container text-on-error-container">
                  <XCircle size={20} />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-error-500">{stats.expiredUsers}</p>
              </div>
              <p className="text-on-surface-variant text-sm">{t('admin.expired')}</p>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card variant="elevated" className="p-4">
          <div className="flex flex-wrap gap-2">
            <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
              {t('admin.filter_all')}
            </Chip>
            <Chip selected={filter === 'lifetime'} onClick={() => setFilter('lifetime')}>
              {t('admin.filter_lifetime')}
            </Chip>
            <Chip selected={filter === 'active'} onClick={() => setFilter('active')}>
              {t('admin.filter_active')}
            </Chip>
            <Chip selected={filter === 'trial'} onClick={() => setFilter('trial')}>
              {t('admin.filter_trial')}
            </Chip>
            <Chip selected={filter === 'expired'} onClick={() => setFilter('expired')}>
              {t('admin.filter_expired')}
            </Chip>
          </div>
          </Card>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-high">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold text-on-surface-variant text-sm uppercase tracking-wide">{t('admin.table_user')}</th>
                  <th className="px-6 py-4 font-semibold text-on-surface-variant text-sm uppercase tracking-wide">{t('admin.table_status')}</th>
                  <th className="px-6 py-4 font-semibold text-on-surface-variant text-sm uppercase tracking-wide hidden md:table-cell">{t('admin.table_plan')}</th>
                  <th className="px-6 py-4 font-semibold text-on-surface-variant text-sm uppercase tracking-wide hidden lg:table-cell">{t('admin.table_created')}</th>
                  <th className="px-6 py-4 font-semibold text-on-surface-variant text-sm uppercase tracking-wide hidden md:table-cell">{t('admin.table_activity')}</th>
                  <th className="px-6 py-4 font-semibold text-on-surface-variant text-sm uppercase tracking-wide hidden sm:table-cell">{t('admin.table_last_seen')}</th>
                  <th className="px-6 py-4 font-semibold text-on-surface-variant text-sm uppercase tracking-wide">{t('admin.table_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => (
                  <motion.tr
                    key={u.id}
                    {...staggerChild(index)}
                    className="border-t border-outline-variant hover:bg-surface-container transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar?.startsWith('http') && !failedAvatars.has(u.id) ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                            onError={() => setFailedAvatars(prev => new Set(prev).add(u.id))}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xl font-bold">
                            {u.avatar && !u.avatar.startsWith('http') ? u.avatar : u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-on-surface flex items-center gap-2">
                            {u.name}
                            {u.is_admin === 1 && (
                              <span className="px-2 py-0.5 bg-tertiary-container text-on-tertiary-container text-xs rounded-m3-full font-medium flex items-center gap-1">
                                <Crown size={10} /> Admin
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-on-surface-variant">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${getStatusBadgeClass(u.subscription_status)}`}>
                        {u.subscription_status === 'lifetime' ? t('admin.status_lifetime') :
                         u.subscription_status === 'active' ? t('admin.status_active') :
                         u.subscription_status === 'trial' ? t('admin.status_trial') :
                         u.subscription_status === 'expired' ? t('admin.status_expired') : u.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant hidden md:table-cell">
                      {u.subscription_plan || '-'}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant hidden lg:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <ActivitySparkline values={u.activity ?? []} />
                        <span className="m3-body-small text-on-surface-variant tabular-nums whitespace-nowrap">
                          {t('admin.usage_summary', { total: u.usage_count ?? 0 })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {(() => {
                        const rel = relativeTime(u.last_active);
                        const tone = {
                          recent: 'text-success',
                          idle: 'text-on-surface-variant',
                          dormant: 'text-error',
                          never: 'text-on-surface-variant',
                        }[recencyOf(u.last_active)];
                        return (
                          <span
                            className={`m3-body-medium ${tone}`}
                            title={u.last_active ? formatDate(u.last_active) : undefined}
                          >
                            {rel ?? t('admin.never_seen')}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <IconButton
                          variant="tonal"
                          onClick={() => handleOpenEditModal(u)}
                          label={t('admin.edit_subscription')}
                        >
                          <Edit size={16} />
                        </IconButton>
                        {u.subscription_status !== 'lifetime' && (
                          <IconButton
                            variant="tonal"
                            onClick={() => handleGrantLifetime(u.id)}
                            label={t('admin.grant_lifetime')}
                          >
                            <Crown size={16} />
                          </IconButton>
                        )}
                        {u.subscription_status !== 'expired' && (
                          <IconButton
                            onClick={() => handleRevokeAccess(u.id)}
                            className="text-error-500"
                            label={t('admin.revoke_access')}
                          >
                            <XCircle size={16} />
                          </IconButton>
                        )}
                        {u.id !== user?.id && (
                          <IconButton
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-error-500"
                            label={t('admin.delete_user')}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </motion.div>

        {filteredUsers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-on-surface-variant"
          >
            {t('admin.no_users_found', { filter })}
          </motion.div>
        )}

        {/* Bug Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card variant="elevated" className="p-6">
          <button
            onClick={() => setBugReportsOpen(!bugReportsOpen)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="text-tertiary" size={28} />
              <h2 className="text-2xl font-bold text-on-surface">{t('admin.bug_reports')}</h2>
              {bugReports.length > 0 && (
                <span className="text-sm bg-surface-container-highest text-on-surface-variant px-2.5 py-0.5 rounded-m3-full">{bugReports.length}</span>
              )}
            </div>
            <ChevronDown size={24} className={`text-on-surface-variant transform transition-transform ${bugReportsOpen ? 'rotate-180' : ''}`} />
          </button>

          {bugReportsOpen && <div className="mt-6">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary-container text-on-secondary-container rounded-m3-md">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-on-surface">{bugReports.length}</p>
                  <p className="text-sm text-on-surface-variant">{t('admin.total_reports')}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-error-container text-on-error-container rounded-m3-md">
                  <XCircle size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-on-surface">{bugReports.filter(r => r.status === 'open').length}</p>
                  <p className="text-sm text-on-surface-variant">{t('admin.open')}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary-container text-on-secondary-container rounded-m3-md">
                  <Edit size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-on-surface">{bugReports.filter(r => r.status === 'in_progress').length}</p>
                  <p className="text-sm text-on-surface-variant">{t('admin.in_progress')}</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-container text-on-success-container rounded-m3-md">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-on-surface">{bugReports.filter(r => r.status === 'resolved').length}</p>
                  <p className="text-sm text-on-surface-variant">{t('admin.resolved')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.status_label')}</label>
              <Select<string>
                value={bugFilter}
                onChange={setBugFilter}
                aria-label={t('admin.status_label')}
                options={[
                  { value: 'all', label: t('admin.select_all') },
                  { value: 'open', label: t('admin.select_open') },
                  { value: 'in_progress', label: t('admin.select_in_progress') },
                  { value: 'resolved', label: t('admin.select_resolved') },
                  { value: 'closed', label: t('admin.select_closed') },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.severity_label')}</label>
              <Select<string>
                value={bugSeverityFilter}
                onChange={setBugSeverityFilter}
                aria-label={t('admin.severity_label')}
                options={[
                  { value: 'all', label: t('admin.select_all') },
                  { value: 'critical', label: t('admin.select_critical') },
                  { value: 'high', label: t('admin.select_high') },
                  { value: 'medium', label: t('admin.select_medium') },
                  { value: 'low', label: t('admin.select_low') },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.user_label')}</label>
              <Select<string>
                value={bugUserFilter}
                onChange={setBugUserFilter}
                aria-label={t('admin.user_label')}
                options={reporterOptions(bugReports)}
              />
            </div>
          </div>

          {/* Bug Reports Table */}
          {bugLoading ? (
            <div className="text-center py-12 text-on-surface-variant">
              {t('admin.loading_bug_reports')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('admin.table_title')}</th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('admin.table_reporter')}</th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('admin.table_severity')}</th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('admin.table_bug_status')}</th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('admin.table_category')}</th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('admin.table_date')}</th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('admin.table_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bugReports
                    .filter(r => bugFilter === 'all' || r.status === bugFilter)
                    .filter(r => bugSeverityFilter === 'all' || r.severity === bugSeverityFilter)
                    .filter(r => filterByReporter([r], bugUserFilter).length > 0)
                    .sort((a, b) => {
                      const statusOrder: Record<string, number> = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
                      const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
                      if (orderDiff !== 0) return orderDiff;
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })
                    .map((report) => (
                      <tr
                        key={report.id}
                        className="border-b border-outline-variant hover:bg-surface-container transition-colors"
                      >
                        <td className="py-3 px-4 text-on-surface font-medium">{report.title}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p className="text-on-surface">{report.userName}</p>
                            <p className="text-on-surface-variant text-xs">{report.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-m3-sm text-xs font-semibold ${
                            report.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                            report.severity === 'high' ? 'bg-tertiary-container text-on-tertiary-container' :
                            report.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' :
                            'bg-surface-container-highest text-on-surface-variant'
                          }`}>
                            {report.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Select<string>
                            value={report.status}
                            onChange={(status) => handleUpdateBugStatus(report.id, status)}
                            size="sm"
                            inline
                            aria-label={t('admin.status_label')}
                            className={`font-semibold border-none ${
                              report.status === 'open' ? 'bg-error-container text-on-error-container' :
                              report.status === 'in_progress' ? 'bg-secondary-container text-on-secondary-container' :
                              report.status === 'resolved' ? 'bg-success-container text-on-success-container' :
                              'bg-surface-container-highest text-on-surface-variant'
                            }`}
                            options={[
                              { value: 'open', label: t('admin.status_open') },
                              { value: 'in_progress', label: t('admin.status_in_progress') },
                              { value: 'resolved', label: t('admin.status_resolved') },
                              { value: 'closed', label: t('admin.status_closed') },
                            ]}
                          />
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant capitalize">{report.category}</td>
                        <td className="py-3 px-4 text-on-surface-variant text-sm">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <IconButton
                              variant="tonal"
                              onClick={() => setSelectedBugReport(report)}
                              label={t('admin.view_details')}
                            >
                              <Eye size={16} />
                            </IconButton>
                            <IconButton
                              variant="tonal"
                              onClick={() => {
                                const text = [
                                  `Bug Report: ${report.title}`,
                                  `Status: ${report.status.replace('_', ' ').toUpperCase()}`,
                                  `Severity: ${report.severity.toUpperCase()}`,
                                  `Category: ${report.category}`,
                                  `Reporter: ${report.userName} (${report.userEmail})`,
                                  `Date: ${new Date(report.createdAt).toLocaleDateString()}`,
                                  `Description: ${report.description}`,
                                  report.adminNotes ? `Admin Notes: ${report.adminNotes}` : '',
                                ].filter(Boolean).join('\n');
                                navigator.clipboard.writeText(text);
                              }}
                              label={t('admin.copy_clipboard')}
                            >
                              <Copy size={16} />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDeleteBugReport(report.id)}
                              className="text-error-500"
                              label={t('common.delete')}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          </div>}
          </Card>
        </motion.div>

        {/* Debug Flags Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card variant="elevated" className="p-6">
          <button
            onClick={() => setDebugFlagsOpen(!debugFlagsOpen)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Flag className="text-tertiary" size={28} />
              <h2 className="text-2xl font-bold text-on-surface">{t('debug.debug_flags')}</h2>
              {debugFlags.length > 0 && (
                <span className="text-sm bg-surface-container-highest text-on-surface-variant px-2.5 py-0.5 rounded-m3-full">{debugFlags.length}</span>
              )}
            </div>
            <ChevronDown size={24} className={`text-on-surface-variant transform transition-transform ${debugFlagsOpen ? 'rotate-180' : ''}`} />
          </button>

          {debugFlagsOpen && <div className="mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tertiary-container text-on-tertiary-container rounded-m3-md">
                    <Flag size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-on-surface">{debugFlags.length}</p>
                    <p className="text-sm text-on-surface-variant">{t('debug.total_flags')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-error-container text-on-error-container rounded-m3-md">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-on-surface">{debugFlags.filter(f => f.status === 'open').length}</p>
                    <p className="text-sm text-on-surface-variant">{t('admin.open')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary-container text-on-secondary-container rounded-m3-md">
                    <Search size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-on-surface">{debugFlags.filter(f => f.status === 'investigating').length}</p>
                    <p className="text-sm text-on-surface-variant">{t('debug.investigating')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-container text-on-success-container rounded-m3-md">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-on-surface">{debugFlags.filter(f => f.status === 'resolved').length}</p>
                    <p className="text-sm text-on-surface-variant">{t('admin.resolved')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.status_label')}</label>
                <Select<string>
                  value={debugFilter}
                  onChange={setDebugFilter}
                  aria-label={t('admin.status_label')}
                  options={[
                    { value: 'all', label: t('debug.select_all') },
                    { value: 'open', label: t('debug.select_open') },
                    { value: 'investigating', label: t('debug.select_investigating') },
                    { value: 'resolved', label: t('debug.select_resolved') },
                    { value: 'dismissed', label: t('debug.select_dismissed') },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.user_label')}</label>
                <Select<string>
                  value={debugUserFilter}
                  onChange={setDebugUserFilter}
                  aria-label={t('admin.user_label')}
                  options={reporterOptions(debugFlags)}
                />
              </div>
            </div>

            {/* Debug Flags Table */}
            {debugLoading ? (
              <div className="text-center py-12 text-on-surface-variant">{t('debug.loading_flags')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('debug.table_comment')}</th>
                      <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('debug.table_route')}</th>
                      <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('debug.table_status')}</th>
                      <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('debug.table_date')}</th>
                      <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">{t('debug.table_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugFlags
                      .filter(f => debugFilter === 'all' || f.status === debugFilter)
                      .filter(f => filterByReporter([f], debugUserFilter).length > 0)
                      .sort((a, b) => {
                        const statusOrder: Record<string, number> = { open: 0, investigating: 1, resolved: 2, dismissed: 3 };
                        const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
                        if (orderDiff !== 0) return orderDiff;
                        return b.createdAt - a.createdAt;
                      })
                      .map(flag => (
                        <tr key={flag.id} className="border-b border-outline-variant hover:bg-surface-container transition-colors">
                          <td className="py-3 px-4 text-on-surface font-medium max-w-xs truncate">{flag.comment}</td>
                          <td className="py-3 px-4 text-on-surface-variant font-mono text-sm">{flag.route || '-'}</td>
                          <td className="py-3 px-4">
                            <Select<string>
                              value={flag.status}
                              onChange={(status) => handleUpdateDebugStatus(flag.id, status)}
                              size="sm"
                              inline
                              aria-label={t('admin.status_label')}
                              className={`font-semibold border-none ${
                                flag.status === 'open' ? 'bg-error-container text-on-error-container' :
                                flag.status === 'investigating' ? 'bg-secondary-container text-on-secondary-container' :
                                flag.status === 'resolved' ? 'bg-success-container text-on-success-container' :
                                'bg-surface-container-highest text-on-surface-variant'
                              }`}
                              options={[
                                { value: 'open', label: t('debug.status_open') },
                                { value: 'investigating', label: t('debug.status_investigating') },
                                { value: 'resolved', label: t('debug.status_resolved') },
                                { value: 'dismissed', label: t('debug.status_dismissed') },
                              ]}
                            />
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant text-sm">
                            {new Date(flag.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <IconButton
                                variant="tonal"
                                onClick={() => setSelectedDebugFlag(flag)}
                                label={t('admin.view_details')}
                              >
                                <Eye size={16} />
                              </IconButton>
                              <IconButton
                                variant="tonal"
                                onClick={() => handleCopyForAI(flag)}
                                className={copiedFlagId === flag.id ? 'text-success-500' : 'text-tertiary'}
                                label={t('debug.copy_for_ai')}
                              >
                                <Copy size={16} />
                              </IconButton>
                              <IconButton
                                onClick={() => handleDeleteDebugFlag(flag.id)}
                                className="text-error-500"
                                label={t('common.delete')}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>}
          </Card>
        </motion.div>

        {/* Debug Flag Details Modal */}
        {selectedDebugFlag && (
          <div className="m3-scrim">
            <div className="m3-dialog max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-on-surface">{t('debug.flag_details')}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={copiedFlagId === selectedDebugFlag.id ? 'success' : 'tonal'}
                    icon={<Copy size={16} />}
                    onClick={() => handleCopyForAI(selectedDebugFlag)}
                  >
                    {copiedFlagId === selectedDebugFlag.id ? t('debug.copied') : t('debug.copy_for_ai')}
                  </Button>
                  <IconButton label={t('common.close')} onClick={() => setSelectedDebugFlag(null)}>
                    <XCircle size={24} />
                  </IconButton>
                </div>
              </div>

              <div className="space-y-6">
                {/* Comment */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.description')}</label>
                  <p className="text-on-surface bg-surface-container rounded-m3-md p-4 border border-outline-variant whitespace-pre-wrap">
                    {selectedDebugFlag.comment}
                  </p>
                </div>

                {/* Screenshot */}
                {selectedDebugFlag.screenshotUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.screenshot')}</label>
                    <img
                      src={selectedDebugFlag.screenshotUrl}
                      alt="Debug screenshot"
                      className="w-full rounded-m3-md border border-outline-variant cursor-pointer hover:border-primary-500 transition-colors"
                      onClick={() => window.open(selectedDebugFlag.screenshotUrl, '_blank')}
                    />
                  </div>
                )}

                {/* Browser Info */}
                {selectedDebugFlag.browserInfo && (
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.browser_info')}</label>
                    <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant text-sm">
                      <p className="text-on-surface-variant mb-1"><span className="text-on-surface font-medium">{t('admin.user_agent')}:</span> {selectedDebugFlag.browserInfo.userAgent}</p>
                      <p className="text-on-surface-variant mb-1"><span className="text-on-surface font-medium">{t('admin.screen')}:</span> {selectedDebugFlag.browserInfo.screenResolution}</p>
                      <p className="text-on-surface-variant"><span className="text-on-surface font-medium">{t('admin.viewport')}:</span> {selectedDebugFlag.browserInfo.viewport}</p>
                    </div>
                  </div>
                )}

                {/* Route */}
                {selectedDebugFlag.route && (
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.route')}</label>
                    <p className="text-on-surface bg-surface-container rounded-m3-md p-3 border border-outline-variant font-mono text-sm">
                      {selectedDebugFlag.route}
                    </p>
                  </div>
                )}

                {/* Game State */}
                {!!selectedDebugFlag.gameState && (
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('debug.game_state')}</label>
                    <pre className="text-on-surface bg-surface-container rounded-m3-md p-4 border border-outline-variant font-mono text-xs overflow-x-auto">
                      {JSON.stringify(selectedDebugFlag.gameState, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Log Entries */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    {t('debug.log_entries')} ({selectedDebugFlag.logEntries?.length || 0})
                  </label>
                  {selectedDebugFlag.logEntries && selectedDebugFlag.logEntries.length > 0 ? (
                    <div className="bg-surface-container-low rounded-m3-md border border-outline-variant max-h-80 overflow-y-auto p-3 font-mono text-xs">
                      {selectedDebugFlag.logEntries.map((entry, i) => (
                        <div key={i} className={`py-0.5 ${
                          entry.level === 'error' ? 'text-error-500' :
                          entry.level === 'warn' ? 'text-tertiary' :
                          'text-on-surface-variant'
                        }`}>
                          <span className="text-on-surface-variant/60">[{entry.timestamp.split('T')[1]?.slice(0, 12)}]</span>
                          {' '}
                          <span className={`font-semibold ${
                            entry.level === 'error' ? 'text-error-500' :
                            entry.level === 'warn' ? 'text-tertiary' :
                            entry.level === 'info' ? 'text-primary' :
                            'text-on-surface-variant/60'
                          }`}>{entry.level.toUpperCase().padEnd(5)}</span>
                          {' '}
                          <span className="text-tertiary/70">[{entry.category}]</span>
                          {' '}
                          {entry.message}
                          {entry.data != null && (
                            <div className="text-on-surface-variant/60 pl-4 break-all">
                              {String(JSON.stringify(entry.data)).slice(0, 200)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm">{t('debug.no_logs')}</p>
                  )}
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.admin_notes')}</label>
                  <textarea
                    defaultValue={selectedDebugFlag.adminNotes || ''}
                    onBlur={(e) => handleUpdateDebugNotes(selectedDebugFlag.id, e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-m3-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-500 resize-none"
                    rows={3}
                    placeholder={t('admin.admin_notes_placeholder')}
                  />
                </div>

                {/* Status Update */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.update_status')}</label>
                  <div className="flex gap-2">
                    {(['open', 'investigating', 'resolved', 'dismissed'] as const).map(status => (
                      <Button
                        key={status}
                        fullWidth
                        size="sm"
                        variant={selectedDebugFlag.status === status ? 'filled' : 'tonal'}
                        onClick={() => handleUpdateDebugStatus(selectedDebugFlag.id, status)}
                      >
                        {t(`debug.status_${status}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Edit Modal */}
        {editingUser && (
          <Dialog
            open={!!editingUser}
            onClose={() => setEditingUser(null)}
            title={t('admin.edit_subscription_title')}
            widthClassName="max-w-2xl"
            actions={
              <>
                <Button variant="text" onClick={() => setEditingUser(null)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="filled" onClick={handleUpdateSubscription}>
                  {t('common.save')}
                </Button>
              </>
            }
          >
              <div className="space-y-4">
                {/* User Info */}
                <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant">
                  <div className="flex items-center gap-3 mb-2">
                    {editingUser.avatar?.startsWith('http') ? (
                      <img
                        src={editingUser.avatar}
                        alt={editingUser.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-outline-variant"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xl font-bold">
                        {editingUser.avatar || editingUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-on-surface">{editingUser.name}</p>
                      <p className="text-sm text-on-surface-variant">{editingUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    {t('admin.status_required')}
                  </label>
                  <Select<string>
                    value={editFormData.subscriptionStatus}
                    onChange={(subscriptionStatus) => setEditFormData({ ...editFormData, subscriptionStatus })}
                    size="lg"
                    aria-label={t('admin.status_label')}
                    options={[
                      { value: 'expired', label: t('admin.option_expired') },
                      { value: 'trial', label: t('admin.option_trial') },
                      { value: 'active', label: t('admin.option_active') },
                      { value: 'lifetime', label: t('admin.option_lifetime') },
                    ]}
                  />
                </div>

                {/* Plan */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    {t('admin.plan_label')}
                  </label>
                  <Select<string>
                    value={editFormData.subscriptionPlan}
                    onChange={(subscriptionPlan) => setEditFormData({ ...editFormData, subscriptionPlan })}
                    size="lg"
                    aria-label={t('admin.plan_label')}
                    options={[
                      { value: '', label: t('admin.plan_none') },
                      { value: 'monthly', label: t('admin.plan_monthly') },
                      { value: 'annual', label: t('admin.plan_annual') },
                      { value: 'lifetime', label: t('admin.plan_lifetime') },
                    ]}
                  />
                </div>

                {/* Ends At */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    {t('admin.expiry_date')}
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.subscriptionEndsAt}
                    onChange={(e) => setEditFormData({ ...editFormData, subscriptionEndsAt: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-m3-md text-on-surface focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    {t('admin.expiry_hint')}
                  </p>
                </div>
              </div>
          </Dialog>
        )}

        {/* Bug Report Details Modal */}
        {selectedBugReport && (
          <div className="m3-scrim">
            <div className="m3-dialog max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-on-surface">{t('admin.bug_report_details')}</h3>
                <IconButton label={t('common.close')} onClick={() => setSelectedBugReport(null)}>
                  <XCircle size={24} />
                </IconButton>
              </div>

              <div className="space-y-6">
                {/* Title & Status */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-on-surface mb-2">{selectedBugReport.title}</h4>
                      <p className="text-on-surface-variant text-sm">
                        {t('admin.reported_by')} {selectedBugReport.userName} ({selectedBugReport.userEmail})
                      </p>
                      <p className="text-on-surface-variant text-sm">
                        {new Date(selectedBugReport.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-m3-sm font-semibold text-sm ${
                        selectedBugReport.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                        selectedBugReport.severity === 'high' ? 'bg-tertiary-container text-on-tertiary-container' :
                        selectedBugReport.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' :
                        'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {selectedBugReport.severity.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-m3-sm font-semibold text-sm bg-surface-container-highest text-on-surface-variant capitalize">
                        {selectedBugReport.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.description')}</label>
                  <p className="text-on-surface bg-surface-container rounded-m3-md p-4 border border-outline-variant whitespace-pre-wrap">
                    {selectedBugReport.description}
                  </p>
                </div>

                {/* Screenshot */}
                {selectedBugReport.screenshotUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.screenshot')}</label>
                    <div className="relative group">
                      <img
                        src={selectedBugReport.screenshotUrl}
                        alt="Bug screenshot"
                        className="w-full rounded-m3-md border border-outline-variant cursor-pointer hover:border-primary-500 transition-colors"
                        onClick={() => window.open(selectedBugReport.screenshotUrl, '_blank')}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={selectedBugReport.screenshotUrl}
                          download={`bug-report-${selectedBugReport.id}.png`}
                          className="px-3 py-1 bg-surface-container-highest hover:bg-surface-container-high text-on-surface text-sm rounded-m3-md transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('admin.download')}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Browser Info */}
                {selectedBugReport.browserInfo && (
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.browser_info')}</label>
                    <div className="bg-surface-container rounded-m3-md p-4 border border-outline-variant text-sm">
                      <p className="text-on-surface-variant mb-1"><span className="text-on-surface font-medium">{t('admin.user_agent')}:</span> {selectedBugReport.browserInfo.userAgent}</p>
                      <p className="text-on-surface-variant mb-1"><span className="text-on-surface font-medium">{t('admin.screen')}:</span> {selectedBugReport.browserInfo.screenResolution}</p>
                      <p className="text-on-surface-variant"><span className="text-on-surface font-medium">{t('admin.viewport')}:</span> {selectedBugReport.browserInfo.viewport}</p>
                    </div>
                  </div>
                )}

                {/* Route */}
                {selectedBugReport.route && (
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.route')}</label>
                    <p className="text-on-surface bg-surface-container rounded-m3-md p-3 border border-outline-variant font-mono text-sm">
                      {selectedBugReport.route}
                    </p>
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.admin_notes')}</label>
                  <textarea
                    defaultValue={selectedBugReport.adminNotes || ''}
                    onBlur={(e) => handleUpdateBugNotes(selectedBugReport.id, e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-m3-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-500 resize-none"
                    rows={4}
                    placeholder={t('admin.admin_notes_placeholder')}
                  />
                </div>

                {/* Status Update */}
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('admin.update_status')}</label>
                  <div className="flex gap-2">
                    <Button
                      fullWidth
                      size="sm"
                      variant={selectedBugReport.status === 'open' ? 'filled' : 'tonal'}
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'open')}
                    >
                      {t('admin.status_open')}
                    </Button>
                    <Button
                      fullWidth
                      size="sm"
                      variant={selectedBugReport.status === 'in_progress' ? 'filled' : 'tonal'}
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'in_progress')}
                    >
                      {t('admin.status_in_progress')}
                    </Button>
                    <Button
                      fullWidth
                      size="sm"
                      variant={selectedBugReport.status === 'resolved' ? 'filled' : 'tonal'}
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'resolved')}
                    >
                      {t('admin.status_resolved')}
                    </Button>
                    <Button
                      fullWidth
                      size="sm"
                      variant={selectedBugReport.status === 'closed' ? 'filled' : 'tonal'}
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'closed')}
                    >
                      {t('admin.status_closed')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default AdminPanel;
