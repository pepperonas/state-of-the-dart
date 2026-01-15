import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 text-xl mb-4">❌ {error}</p>
          <button onClick={loadData} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary mb-4"
          >
            ← Back to Menu
          </button>
          <h1 className="text-4xl font-bold gradient-text mb-2">👑 Admin Panel</h1>
          <p className="text-dark-300">Manage users and subscriptions</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold gradient-text mb-1">{stats.totalUsers}</p>
              <p className="text-dark-300">Total Users</p>
            </div>
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold text-green-400 mb-1">{stats.activeSubscriptions}</p>
              <p className="text-dark-300">Active Subs</p>
            </div>
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold text-amber-400 mb-1">{stats.lifetimeSubscriptions}</p>
              <p className="text-dark-300">Lifetime</p>
            </div>
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold text-blue-400 mb-1">{stats.trialUsers}</p>
              <p className="text-dark-300">Trial</p>
            </div>
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold text-red-400 mb-1">{stats.expiredUsers}</p>
              <p className="text-dark-300">Expired</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('lifetime')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'lifetime' ? 'bg-amber-600 text-white' : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
              }`}
            >
              Lifetime
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'active' ? 'bg-green-600 text-white' : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('trial')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'trial' ? 'bg-blue-600 text-white' : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
              }`}
            >
              Trial
            </button>
            <button
              onClick={() => setFilter('expired')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'expired' ? 'bg-red-600 text-white' : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
              }`}
            >
              Expired
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800/50">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold text-dark-200">User</th>
                  <th className="px-6 py-4 font-semibold text-dark-200">Status</th>
                  <th className="px-6 py-4 font-semibold text-dark-200">Plan</th>
                  <th className="px-6 py-4 font-semibold text-dark-200">Created</th>
                  <th className="px-6 py-4 font-semibold text-dark-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-dark-700 hover:bg-dark-800/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl">
                          {u.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-white flex items-center gap-2">
                            {u.name}
                            {u.is_admin === 1 && <span className="text-amber-400 text-xs">👑 ADMIN</span>}
                          </p>
                          <p className="text-sm text-dark-300">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadgeClass(u.subscription_status)}`}>
                        {u.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-200">
                      {u.subscription_plan || '-'}
                    </td>
                    <td className="px-6 py-4 text-dark-200">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {u.subscription_status !== 'lifetime' && (
                          <button
                            onClick={() => handleGrantLifetime(u.id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg transition-colors"
                            title="Grant Lifetime"
                          >
                            🌟 Lifetime
                          </button>
                        )}
                        {u.subscription_status !== 'expired' && (
                          <button
                            onClick={() => handleRevokeAccess(u.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                            title="Revoke Access"
                          >
                            ❌ Revoke
                          </button>
                        )}
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.is_admin === 1)}
                            className={`px-3 py-1 text-white text-xs rounded-lg transition-colors ${
                              u.is_admin === 1 ? 'bg-gray-600 hover:bg-gray-700' : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                            title={u.is_admin === 1 ? 'Remove Admin' : 'Make Admin'}
                          >
                            {u.is_admin === 1 ? '👤 Remove Admin' : '👑 Make Admin'}
                          </button>
                        )}
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg transition-colors"
                            title="Delete User"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-dark-300">
            No users found with filter: {filter}
          </div>
        )}
      </div>
    </div>
  );
};


export default AdminPanel;
