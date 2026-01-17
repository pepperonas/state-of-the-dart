import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Crown, Zap, Clock, XCircle, Shield, Trash2, UserMinus, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadData();
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
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:bg-dark-700/50 transition-all"
          >
            <ArrowLeft size={20} />
            Zurück
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
      </div>
    </div>
  );
};


export default AdminPanel;
