import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Trash2, Save, AlertCircle,
  CheckCircle, Lock, CreditCard
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { BackButton, Button, Card, TextField } from '../common';

const AVATAR_EMOJIS = ['👤', '🎯', '🎲', '🎮', '🏆', '⚡', '🔥', '💎', '🎪', '🎭', '🎨', '🎸', '🎹', '🎺', '🎻', '🥁', '🎤', '🎧', '🎬', '🎯', '🏹', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎿', '🛷', '🏂'];

// Helper to check if avatar is a URL (from Google OAuth)
const isAvatarUrl = (avatar: string) => avatar?.startsWith('http');

// Helper to render avatar (emoji or image)
const renderAvatar = (avatarValue: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const imageSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (isAvatarUrl(avatarValue)) {
    return (
      <img
        src={avatarValue}
        alt="Avatar"
        className={`${imageSizeClasses[size]} rounded-full object-cover`}
      />
    );
  }
  return <span>{avatarValue || '👤'}</span>;
};

const UserSettings: React.FC = () => {
  const { t } = useTranslation();
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
      console.error('Stripe Portal Error:', err);
      // Don't show error to user if they don't have a Stripe customer yet
      // This happens for Google Auth users who haven't made a payment
      if (err.message?.includes('400')) {
        setError('Du hast noch keine Zahlungen getätigt. Das Kundenportal ist nur für zahlende Kunden verfügbar.');
      } else {
        setError(err.message || 'Fehler beim Öffnen des Kundenportals');
      }
      setLoading(null);
    } finally {
      setLoading(null);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <BackButton onClick={() => navigate(-1)} />

        <h1 className="m3-headline-medium text-on-surface mb-8">Account Einstellungen</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-success-container text-on-success-container rounded-m3-md flex items-center gap-2">
            <CheckCircle size={20} />
            <span className="m3-body-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-m3-md flex items-center gap-3 shadow-m3-1">
            <AlertCircle size={24} className="flex-shrink-0" />
            <span className="m3-body-medium font-semibold">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Section */}
          <Card variant="elevated" className="p-6">
            <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
              <User size={24} />
              Profil
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar Picker */}
              <div>
                <label className="block m3-label-large text-on-surface mb-2">
                  Avatar
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => !isAvatarUrl(avatar) && setShowAvatarPicker(!showAvatarPicker)}
                    className={`w-16 h-16 text-4xl bg-surface-container border border-outline-variant rounded-m3-md transition-colors flex items-center justify-center ${
                      isAvatarUrl(avatar) ? 'cursor-default' : 'hover:bg-surface-container-high'
                    }`}
                  >
                    {renderAvatar(avatar, 'md')}
                  </button>
                  <span className="text-on-surface-variant m3-body-small">
                    {isAvatarUrl(avatar)
                      ? 'Google Avatar (kann nicht geändert werden)'
                      : 'Klicke um Avatar zu ändern'}
                  </span>
                </div>

                {showAvatarPicker && (
                  <div className="mt-4 p-4 bg-surface-container rounded-m3-md border border-outline-variant grid grid-cols-8 sm:grid-cols-12 gap-2 max-h-64 overflow-y-auto">
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setAvatar(emoji);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-10 h-10 text-2xl rounded-m3-md hover:bg-surface-container-high transition-colors ${
                          avatar === emoji ? 'bg-primary-container ring-2 ring-primary' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <TextField
                label="Name"
                icon={<User size={20} />}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {/* Current Email (read-only) */}
              <div>
                <TextField
                  label="Email"
                  icon={<Mail size={20} />}
                  type="email"
                  value={user.email}
                  disabled
                />
                <p className="m3-body-small text-on-surface-variant mt-1">
                  Um deine Email zu ändern, nutze den Bereich weiter unten
                </p>
              </div>

              <Button
                type="submit"
                variant="filled"
                fullWidth
                loading={loading === 'profile'}
                icon={<Save size={20} />}
              >
                {loading === 'profile' ? 'Speichern...' : 'Speichern'}
              </Button>
            </form>
          </Card>

          {/* Subscription Management - only show for active subscriptions (monthly) */}
          {/* Lifetime users don't need portal access as they have no recurring billing */}
          {user.subscriptionStatus === 'active' && (
            <Card variant="elevated" className="p-6">
              <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
                <CreditCard size={24} />
                Abonnement verwalten
              </h2>
              <p className="text-on-surface m3-body-medium mb-4">
                Verwalte dein Abo, ändere Zahlungsmethoden oder kündige.
              </p>
              <Button
                onClick={handleManageSubscription}
                variant="accent"
                fullWidth
                loading={loading === 'subscription'}
                icon={<CreditCard size={20} />}
              >
                {loading === 'subscription' ? 'Öffne Portal...' : 'Kundenportal öffnen'}
              </Button>
            </Card>
          )}

          {/* Change Email */}
          <Card variant="elevated" className="p-6">
            <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
              <Mail size={24} />
              Email ändern
            </h2>

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <TextField
                label="Neue Email"
                icon={<Mail size={20} />}
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="neue@email.de"
                required
              />

              <TextField
                label="Passwort bestätigen"
                icon={<Lock size={20} />}
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Dein aktuelles Passwort"
                required
              />

              <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-m3-md">
                <p className="m3-body-small font-semibold flex items-center gap-2">
                  <AlertCircle size={18} />
                  ⚠️ Du wirst ausgeloggt und musst deine neue Email-Adresse verifizieren.
                </p>
              </div>

              <Button
                type="submit"
                variant="tonal"
                fullWidth
                loading={loading === 'email'}
                icon={<Mail size={20} />}
              >
                {loading === 'email' ? 'Aktualisieren...' : 'Email ändern'}
              </Button>
            </form>
          </Card>

          {/* Danger Zone */}
          <Card variant="outlined" className="p-6 border-error">
            <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
              <Trash2 size={24} className="text-error" />
              <span>🚨 Gefahrenzone</span>
            </h2>

            <p className="text-on-surface mb-4 m3-body-medium">
              Wenn du deinen Account löschst, werden <strong className="text-on-error-container bg-error-container px-2 py-1 rounded-m3-sm">alle deine Daten unwiderruflich gelöscht</strong>.
              Dies beinhaltet: Matches, Stats, Achievements, Personal Bests, Tenants und Spieler.
            </p>

            {!confirmDelete ? (
              <Button
                onClick={() => setConfirmDelete(true)}
                variant="outlined"
                fullWidth
                icon={<Trash2 size={20} />}
                className="text-error border-error"
              >
                Account löschen
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-error-container text-on-error-container rounded-m3-md">
                  <p className="m3-body-small font-bold flex items-center gap-2">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    ⚠️ WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden!
                  </p>
                </div>

                <TextField
                  icon={<Lock size={20} />}
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Passwort zur Bestätigung"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeletePassword('');
                    }}
                    variant="text"
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={loading === 'delete' || !deletePassword}
                    variant="danger"
                    className="flex-1"
                    loading={loading === 'delete'}
                    icon={<Trash2 size={20} />}
                  >
                    {loading === 'delete' ? 'Lösche...' : 'Endgültig löschen'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
