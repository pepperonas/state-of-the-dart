import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Trash2, Save, AlertCircle, Loader, 
  CheckCircle, ArrowLeft, Lock, CreditCard 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AVATAR_EMOJIS = ['👤', '🎯', '🎲', '🎮', '🏆', '⚡', '🔥', '💎', '🎪', '🎭', '🎨', '🎸', '🎹', '🎺', '🎻', '🥁', '🎤', '🎧', '🎬', '🎯', '🏹', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎿', '🛷', '🏂'];

const UserSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '👤');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('profile');
    setError('');
    setSuccess('');

    try {
      await api.auth.updateProfile(name, avatar);
      await refreshUser();
      setSuccess('Profil erfolgreich aktualisiert!');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Aktualisieren des Profils');
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    setError('');
    setSuccess('');

    try {
      await api.auth.updateEmail(newEmail, emailPassword);
      setSuccess('Email aktualisiert! Bitte verifiziere deine neue Email-Adresse.');
      setNewEmail('');
      setEmailPassword('');
      // Wait 2 seconds then logout (user needs to verify new email)
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Aktualisieren der Email');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading('delete');
    setError('');

    try {
      await api.auth.deleteAccount(deletePassword);
      logout();
      navigate('/login?deleted=true');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen des Accounts');
      setConfirmDelete(false);
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading('subscription');
    setError('');

    try {
      const response = await api.payment.createPortal();
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Öffnen des Kundenportals');
      setLoading(null);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          Zurück
        </button>

        <h1 className="text-4xl font-bold text-white mb-8">Account Einstellungen</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-success-500/10 border border-success-500/30 rounded-lg flex items-center gap-2 text-success-400">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error-500/10 border border-error-500/30 rounded-lg flex items-center gap-2 text-error-400">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <User size={24} />
              Profil
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar Picker */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Avatar
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="w-16 h-16 text-4xl bg-dark-800 border border-dark-600 rounded-lg hover:bg-dark-700 transition-colors"
                  >
                    {avatar}
                  </button>
                  <span className="text-dark-400 text-sm">Klicke um Avatar zu ändern</span>
                </div>

                {showAvatarPicker && (
                  <div className="mt-4 p-4 bg-dark-800 rounded-lg border border-dark-600 grid grid-cols-8 sm:grid-cols-12 gap-2 max-h-64 overflow-y-auto">
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setAvatar(emoji);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-10 h-10 text-2xl rounded-lg hover:bg-dark-700 transition-colors ${
                          avatar === emoji ? 'bg-primary-500/20 ring-2 ring-primary-500' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Current Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-dark-400 cursor-not-allowed"
                />
                <p className="text-xs text-dark-400 mt-1">
                  Um deine Email zu ändern, nutze den Bereich weiter unten
                </p>
              </div>

              <button
                type="submit"
                disabled={loading === 'profile'}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'profile' ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Speichern
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Subscription Management */}
          {user.subscriptionStatus !== 'none' && (
            <div className="glass-card p-6 rounded-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard size={24} />
                Abonnement verwalten
              </h2>
              <p className="text-dark-300 mb-4">
                Verwalte dein Abo, ändere Zahlungsmethoden oder kündige.
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={loading === 'subscription'}
                className="w-full py-3 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'subscription' ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Öffne Portal...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Kundenportal öffnen
                  </>
                )}
              </button>
            </div>
          )}

          {/* Change Email */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Mail size={24} />
              Email ändern
            </h2>

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Neue Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="neue@email.de"
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Dein aktuelles Passwort"
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="p-4 bg-warning-500/10 border border-warning-500/30 rounded-lg text-warning-400 text-sm">
                ⚠️ Du wirst ausgeloggt und musst deine neue Email-Adresse verifizieren.
              </div>

              <button
                type="submit"
                disabled={loading === 'email'}
                className="w-full py-3 bg-gradient-to-r from-warning-500 to-warning-600 hover:from-warning-600 hover:to-warning-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'email' ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Aktualisieren...
                  </>
                ) : (
                  <>
                    <Mail size={20} />
                    Email ändern
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-6 rounded-xl border-2 border-error-500/30">
            <h2 className="text-2xl font-bold text-error-400 mb-4 flex items-center gap-2">
              <Trash2 size={24} />
              Gefahrenzone
            </h2>

            <p className="text-dark-300 mb-4">
              Wenn du deinen Account löschst, werden <strong>alle deine Daten unwiderruflich gelöscht</strong>.
              Dies beinhaltet: Matches, Stats, Achievements, Personal Bests, Tenants und Spieler.
            </p>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-3 bg-error-500/10 hover:bg-error-500/20 text-error-400 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all border border-error-500/30"
              >
                <Trash2 size={20} />
                Account löschen
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-error-500/10 border border-error-500/30 rounded-lg text-error-400 text-sm">
                  ⚠️ <strong>WARNUNG:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
                </div>

                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Passwort zur Bestätigung"
                  className="w-full px-4 py-3 bg-dark-800 border border-error-500 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-error-500"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeletePassword('');
                    }}
                    className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading === 'delete' || !deletePassword}
                    className="flex-1 py-3 bg-gradient-to-r from-error-500 to-error-600 hover:from-error-600 hover:to-error-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading === 'delete' ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Lösche...
                      </>
                    ) : (
                      <>
                        <Trash2 size={20} />
                        Endgültig löschen
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
