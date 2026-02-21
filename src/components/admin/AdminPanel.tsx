import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Crown, Zap, Clock, XCircle, Shield, Trash2, UserMinus, UserPlus, AlertCircle, Eye, Edit, CheckCircle, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { BugReport } from '../../types';

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
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  lifetimeSubscriptions: number;
  trialUsers: number;
  expiredUsers: number;
}

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
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
  const [selectedBugReport, setSelectedBugReport] = useState<BugReport | null>(null);
  const [bugLoading, setBugLoading] = useState(false);

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

  const handleUpdateBugStatus = async (reportId: string, newStatus: string) => {
    try {
      await api.bugReports.updateStatus(reportId, newStatus);
      await loadBugReports();
      setSelectedBugReport(null);
    } catch (err: any) {
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
    if (!confirm('Are you sure you want to delete this bug report?')) return;

    try {
      await api.bugReports.delete(reportId);
      await loadBugReports();
      setSelectedBugReport(null);
    } catch (err: any) {
      alert('Failed to delete bug report: ' + err.message);
    }
  };

  const handleGrantLifetime = async (userId: string) => {
    if (!confirm('Grant lifetime access to this user?')) return;
    
    try {
      await api.admin.grantLifetime(userId);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!confirm('Revoke access for this user?')) return;
    
    try {
      await api.admin.revokeAccess(userId);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('⚠️ DELETE this user permanently? This cannot be undone!')) return;
    
    try {
      await api.admin.deleteUser(userId);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    const action = isCurrentlyAdmin ? 'remove admin status from' : 'make admin';
    if (!confirm(`${action} this user?`)) return;
    
    try {
      if (isCurrentlyAdmin) {
        await api.admin.removeAdmin(userId);
      } else {
        await api.admin.makeAdmin(userId);
      }
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'lifetime':
        return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white';
      case 'active':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
      case 'trial':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white';
      case 'expired':
        return 'bg-gradient-to-r from-red-500 to-rose-600 text-white';
      default:
        return 'bg-dark-700 text-dark-200';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
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
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-300">Lade Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="glass-card p-8 text-center">
          <p className="text-error-400 text-xl mb-4">{error}</p>
          <button onClick={loadData} className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-semibold transition-all">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Admin Panel</h1>
              <p className="text-dark-300">Benutzer & Abonnements verwalten</p>
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
            <div className="glass-card p-4 md:p-6 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary-500/20">
                  <Users size={20} className="text-primary-400" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalUsers}</p>
              </div>
              <p className="text-dark-400 text-sm">Gesamt</p>
            </div>
            <div className="glass-card p-4 md:p-6 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-success-500/20">
                  <Zap size={20} className="text-success-400" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-success-400">{stats.activeSubscriptions}</p>
              </div>
              <p className="text-dark-400 text-sm">Aktive Abos</p>
            </div>
            <div className="glass-card p-4 md:p-6 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Crown size={20} className="text-amber-400" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-amber-400">{stats.lifetimeSubscriptions}</p>
              </div>
              <p className="text-dark-400 text-sm">Lifetime</p>
            </div>
            <div className="glass-card p-4 md:p-6 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Clock size={20} className="text-blue-400" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-blue-400">{stats.trialUsers}</p>
              </div>
              <p className="text-dark-400 text-sm">Trial</p>
            </div>
            <div className="glass-card p-4 md:p-6 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-error-500/20">
                  <XCircle size={20} className="text-error-400" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-error-400">{stats.expiredUsers}</p>
              </div>
              <p className="text-dark-400 text-sm">Abgelaufen</p>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 mb-6 rounded-xl border border-white/5"
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' : 'bg-dark-700/50 text-dark-200 hover:bg-dark-600/50'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter('lifetime')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'lifetime' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' : 'bg-dark-700/50 text-dark-200 hover:bg-dark-600/50'
              }`}
            >
              Lifetime
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'active' ? 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg' : 'bg-dark-700/50 text-dark-200 hover:bg-dark-600/50'
              }`}
            >
              Aktiv
            </button>
            <button
              onClick={() => setFilter('trial')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'trial' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-dark-700/50 text-dark-200 hover:bg-dark-600/50'
              }`}
            >
              Trial
            </button>
            <button
              onClick={() => setFilter('expired')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'expired' ? 'bg-gradient-to-r from-error-500 to-error-600 text-white shadow-lg' : 'bg-dark-700/50 text-dark-200 hover:bg-dark-600/50'
              }`}
            >
              Abgelaufen
            </button>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden rounded-xl border border-white/5"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800/80">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold text-dark-300 text-sm uppercase tracking-wide">Benutzer</th>
                  <th className="px-6 py-4 font-semibold text-dark-300 text-sm uppercase tracking-wide">Status</th>
                  <th className="px-6 py-4 font-semibold text-dark-300 text-sm uppercase tracking-wide hidden md:table-cell">Plan</th>
                  <th className="px-6 py-4 font-semibold text-dark-300 text-sm uppercase tracking-wide hidden lg:table-cell">Erstellt</th>
                  <th className="px-6 py-4 font-semibold text-dark-300 text-sm uppercase tracking-wide">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                    className="border-t border-dark-700/50 hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar?.startsWith('http') ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl font-bold text-white ${u.avatar?.startsWith('http') ? 'hidden' : ''}`}>
                          {u.avatar?.startsWith('http') ? u.name.charAt(0).toUpperCase() : u.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-white flex items-center gap-2">
                            {u.name}
                            {u.is_admin === 1 && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium flex items-center gap-1">
                                <Crown size={10} /> Admin
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-dark-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${getStatusBadgeClass(u.subscription_status)}`}>
                        {u.subscription_status === 'lifetime' ? 'Lifetime' :
                         u.subscription_status === 'active' ? 'Aktiv' :
                         u.subscription_status === 'trial' ? 'Trial' :
                         u.subscription_status === 'expired' ? 'Abgelaufen' : u.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-300 hidden md:table-cell">
                      {u.subscription_plan || '-'}
                    </td>
                    <td className="px-6 py-4 text-dark-300 hidden lg:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                          title="Abonnement bearbeiten"
                        >
                          <Edit size={16} />
                        </button>
                        {u.subscription_status !== 'lifetime' && (
                          <button
                            onClick={() => handleGrantLifetime(u.id)}
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
                            title="Lifetime gewähren"
                          >
                            <Crown size={16} />
                          </button>
                        )}
                        {u.subscription_status !== 'expired' && (
                          <button
                            onClick={() => handleRevokeAccess(u.id)}
                            className="p-2 bg-error-500/20 hover:bg-error-500/30 text-error-400 rounded-lg transition-colors"
                            title="Zugang entziehen"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.is_admin === 1)}
                            className={`p-2 rounded-lg transition-colors ${
                              u.is_admin === 1
                                ? 'bg-dark-600/50 hover:bg-dark-600 text-dark-300'
                                : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                            }`}
                            title={u.is_admin === 1 ? 'Admin entfernen' : 'Zum Admin machen'}
                          >
                            {u.is_admin === 1 ? <UserMinus size={16} /> : <UserPlus size={16} />}
                          </button>
                        )}
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-colors"
                            title="Benutzer löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {filteredUsers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-dark-400"
          >
            Keine Benutzer mit Filter "{filter}" gefunden
          </motion.div>
        )}

        {/* Bug Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 mt-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="text-warning-400" size={28} />
            <h2 className="text-2xl font-bold text-white">Bug Reports</h2>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <AlertCircle className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{bugReports.length}</p>
                  <p className="text-sm text-dark-300">Total Reports</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="text-red-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{bugReports.filter(r => r.status === 'open').length}</p>
                  <p className="text-sm text-dark-300">Open</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Edit className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{bugReports.filter(r => r.status === 'in_progress').length}</p>
                  <p className="text-sm text-dark-300">In Progress</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="text-green-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{bugReports.filter(r => r.status === 'resolved').length}</p>
                  <p className="text-sm text-dark-300">Resolved</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-dark-300 mb-2">Status</label>
              <select
                value={bugFilter}
                onChange={(e) => setBugFilter(e.target.value)}
                className="px-4 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-warning-500"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-300 mb-2">Severity</label>
              <select
                value={bugSeverityFilter}
                onChange={(e) => setBugSeverityFilter(e.target.value)}
                className="px-4 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-warning-500"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Bug Reports Table */}
          {bugLoading ? (
            <div className="text-center py-12 text-dark-400">
              Loading bug reports...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-dark-300 font-semibold text-sm">Title</th>
                    <th className="text-left py-3 px-4 text-dark-300 font-semibold text-sm">Reporter</th>
                    <th className="text-left py-3 px-4 text-dark-300 font-semibold text-sm">Severity</th>
                    <th className="text-left py-3 px-4 text-dark-300 font-semibold text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-dark-300 font-semibold text-sm">Category</th>
                    <th className="text-left py-3 px-4 text-dark-300 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 text-dark-300 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bugReports
                    .filter(r => bugFilter === 'all' || r.status === bugFilter)
                    .filter(r => bugSeverityFilter === 'all' || r.severity === bugSeverityFilter)
                    .map((report) => (
                      <motion.tr
                        key={report.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-white font-medium">{report.title}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p className="text-white">{report.userName}</p>
                            <p className="text-dark-400 text-xs">{report.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            report.severity === 'critical' ? 'bg-red-600/20 text-red-400' :
                            report.severity === 'high' ? 'bg-orange-600/20 text-orange-400' :
                            report.severity === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                            'bg-blue-600/20 text-blue-400'
                          }`}>
                            {report.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={report.status}
                            onChange={(e) => handleUpdateBugStatus(report.id, e.target.value)}
                            className={`px-2 py-1 rounded text-xs font-semibold border-none cursor-pointer outline-none ${
                              report.status === 'open' ? 'bg-red-500/20 text-red-400' :
                              report.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                              report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-700 text-gray-300'
                            }`}
                          >
                            <option value="open">OPEN</option>
                            <option value="in_progress">IN PROGRESS</option>
                            <option value="resolved">RESOLVED</option>
                            <option value="closed">CLOSED</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-dark-300 capitalize">{report.category}</td>
                        <td className="py-3 px-4 text-dark-400 text-sm">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedBugReport(report)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
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
                              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                              title="Copy to clipboard"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteBugReport(report.id)}
                              className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Subscription Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card rounded-2xl p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Abonnement bearbeiten</h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
                >
                  <XCircle size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* User Info */}
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <div className="flex items-center gap-3 mb-2">
                    {editingUser.avatar?.startsWith('http') ? (
                      <img
                        src={editingUser.avatar}
                        alt={editingUser.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl font-bold text-white">
                        {editingUser.avatar || editingUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white">{editingUser.name}</p>
                      <p className="text-sm text-dark-400">{editingUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">
                    Status *
                  </label>
                  <select
                    value={editFormData.subscriptionStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, subscriptionStatus: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="expired">Abgelaufen (Expired)</option>
                    <option value="trial">Testphase (Trial)</option>
                    <option value="active">Aktiv (Active)</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                {/* Plan */}
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">
                    Plan
                  </label>
                  <select
                    value={editFormData.subscriptionPlan}
                    onChange={(e) => setEditFormData({ ...editFormData, subscriptionPlan: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Kein Plan</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                {/* Ends At */}
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">
                    Ablaufdatum (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.subscriptionEndsAt}
                    onChange={(e) => setEditFormData({ ...editFormData, subscriptionEndsAt: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-xs text-dark-400 mt-1">
                    Leer lassen für unbegrenzt (z.B. bei Lifetime)
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-all"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdateSubscription}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bug Report Details Modal */}
        {selectedBugReport && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Bug Report Details</h3>
                <button
                  onClick={() => setSelectedBugReport(null)}
                  className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
                >
                  <XCircle size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Title & Status */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white mb-2">{selectedBugReport.title}</h4>
                      <p className="text-dark-400 text-sm">
                        Reported by {selectedBugReport.userName} ({selectedBugReport.userEmail})
                      </p>
                      <p className="text-dark-400 text-sm">
                        {new Date(selectedBugReport.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded font-semibold text-sm ${
                        selectedBugReport.severity === 'critical' ? 'bg-red-600/20 text-red-400' :
                        selectedBugReport.severity === 'high' ? 'bg-orange-600/20 text-orange-400' :
                        selectedBugReport.severity === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-blue-600/20 text-blue-400'
                      }`}>
                        {selectedBugReport.severity.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded font-semibold text-sm bg-dark-700 text-dark-300 capitalize">
                        {selectedBugReport.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Description</label>
                  <p className="text-white bg-dark-800/50 rounded-lg p-4 border border-dark-700 whitespace-pre-wrap">
                    {selectedBugReport.description}
                  </p>
                </div>

                {/* Screenshot */}
                {selectedBugReport.screenshotUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-dark-300 mb-2">Screenshot</label>
                    <div className="relative group">
                      <img
                        src={selectedBugReport.screenshotUrl}
                        alt="Bug screenshot"
                        className="w-full rounded-lg border border-dark-700 cursor-pointer hover:border-warning-500 transition-colors"
                        onClick={() => window.open(selectedBugReport.screenshotUrl, '_blank')}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={selectedBugReport.screenshotUrl}
                          download={`bug-report-${selectedBugReport.id}.png`}
                          className="px-3 py-1 bg-dark-900/90 hover:bg-dark-800 text-white text-sm rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Browser Info */}
                {selectedBugReport.browserInfo && (
                  <div>
                    <label className="block text-sm font-semibold text-dark-300 mb-2">Browser Info</label>
                    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700 text-sm">
                      <p className="text-dark-400 mb-1"><span className="text-white font-medium">User Agent:</span> {selectedBugReport.browserInfo.userAgent}</p>
                      <p className="text-dark-400 mb-1"><span className="text-white font-medium">Screen:</span> {selectedBugReport.browserInfo.screenResolution}</p>
                      <p className="text-dark-400"><span className="text-white font-medium">Viewport:</span> {selectedBugReport.browserInfo.viewport}</p>
                    </div>
                  </div>
                )}

                {/* Route */}
                {selectedBugReport.route && (
                  <div>
                    <label className="block text-sm font-semibold text-dark-300 mb-2">Route</label>
                    <p className="text-white bg-dark-800/50 rounded-lg p-3 border border-dark-700 font-mono text-sm">
                      {selectedBugReport.route}
                    </p>
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Admin Notes</label>
                  <textarea
                    defaultValue={selectedBugReport.adminNotes || ''}
                    onBlur={(e) => handleUpdateBugNotes(selectedBugReport.id, e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-warning-500 resize-none"
                    rows={4}
                    placeholder="Add notes for internal tracking..."
                  />
                </div>

                {/* Status Update */}
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Update Status</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'open')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                        selectedBugReport.status === 'open'
                          ? 'bg-red-500/30 text-red-400 border border-red-500'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'in_progress')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                        selectedBugReport.status === 'in_progress'
                          ? 'bg-blue-500/30 text-blue-400 border border-blue-500'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'resolved')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                        selectedBugReport.status === 'resolved'
                          ? 'bg-green-500/30 text-green-400 border border-green-500'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      Resolved
                    </button>
                    <button
                      onClick={() => handleUpdateBugStatus(selectedBugReport.id, 'closed')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                        selectedBugReport.status === 'closed'
                          ? 'bg-gray-700/50 text-gray-300 border border-gray-600'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      Closed
                    </button>
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
