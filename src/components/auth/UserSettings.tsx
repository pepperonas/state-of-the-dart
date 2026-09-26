import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Trash2, Save, AlertCircle,
  CheckCircle, Lock, CreditCard
} from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { BackButton, Button, Card, TextField, PageShell } from '../common';
import { Icon, iconForEmoji, type IconName } from '../icons';

/** The avatar choices, as names from the app's own icon set. */
const AVATAR_ICONS: IconName[] = [
  'user', 'target', 'bullseye', 'board', 'dart', 'dice', 'trophy', 'medal', 'crown',
  'star', 'sparkle', 'gem', 'flame', 'bolt', 'rocket', 'shield', 'heart', 'brain',
  'robot', 'ghost', 'skull', 'music', 'party', 'gift', 'sprout', 'moon', 'sun',
  'snow', 'globe', 'flag', 'eye', 'key', 'bulb', 'wave', 'ribbon', 'slot',
];

// Helper to check if avatar is a URL (from Google OAuth)
const isAvatarUrl = (avatar: string) => avatar?.startsWith('http');

// Helper to render avatar (emoji or image)
const renderAvatar = (avatarValue: string, alt: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const imageSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (isAvatarUrl(avatarValue)) {
    return (
      <img
        src={avatarValue}
        alt={alt}
        className={`${imageSizeClasses[size]} rounded-full object-cover`}
      />
    );
  }
  return <Icon name={iconForEmoji(avatarValue)} size={size === 'sm' ? 20 : size === 'lg' ? 40 : 28} />;
};

const UserSettings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'user');
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
      setSuccess(t('user_settings.profile_updated'));
    } catch (err: any) {
      setError(err.message || t('user_settings.profile_update_failed'));
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
      setSuccess(t('user_settings.email_updated'));
      setNewEmail('');
      setEmailPassword('');
      // Wait 2 seconds then logout (user needs to verify new email)
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('user_settings.email_update_failed'));
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
      setError(err.message || t('user_settings.delete_failed'));
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
        setError(t('user_settings.portal_no_payments'));
      } else {
        setError(err.message || t('user_settings.portal_failed'));
      }
      setLoading(null);
    } finally {
      setLoading(null);
    }
  };

  if (!user) return null;

  return (
    <PageShell
      width="md"
      back={false}
    >
        {/* Header */}
        <BackButton onClick={() => navigate(-1)} />

        <h1 className="m3-headline-medium text-on-surface mb-8">{t('user_settings.title')}</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-success-container text-on-success-container rounded-m3-md flex items-center gap-2 m3-success-in">
            <CheckCircle size={20} />
            <span className="m3-body-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-m3-md flex items-center gap-3 shadow-m3-1 m3-error-in">
            <AlertCircle size={24} className="flex-shrink-0" />
            <span className="m3-body-medium font-semibold">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Section */}
          <Card variant="elevated" className="p-6">
            <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
              <User size={24} />
              {t('user.profile')}
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar Picker */}
              <div>
                <label className="block m3-label-large text-on-surface mb-2">
                  {t('user_settings.avatar')}
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => !isAvatarUrl(avatar) && setShowAvatarPicker(!showAvatarPicker)}
                    aria-label={isAvatarUrl(avatar) ? t('user_settings.avatar') : t('user_settings.click_to_change_avatar')}
                    aria-expanded={isAvatarUrl(avatar) ? undefined : showAvatarPicker}
                    className={`w-16 h-16 text-4xl bg-surface-container border border-outline-variant rounded-m3-md transition-colors flex items-center justify-center ${
                      isAvatarUrl(avatar) ? 'cursor-default' : 'hover:bg-surface-container-high'
                    }`}
                  >
                    {renderAvatar(avatar, t('user_settings.avatar'), 'md')}
                  </button>
                  <span className="text-on-surface-variant m3-body-small">
                    {isAvatarUrl(avatar)
                      ? t('user_settings.google_avatar_locked')
                      : t('user_settings.click_to_change_avatar')}
                  </span>
                </div>

                {showAvatarPicker && (
                  <div className="mt-4 p-4 bg-surface-container rounded-m3-md border border-outline-variant grid grid-cols-8 sm:grid-cols-12 gap-2 max-h-64 overflow-y-auto">
                    {AVATAR_ICONS.map((emoji) => (
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
                label={t('auth.name')}
                icon={<User size={20} />}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {/* Current Email (read-only) */}
              <div>
                <TextField
                  label={t('auth.email')}
                  icon={<Mail size={20} />}
                  type="email"
                  value={user.email}
                  disabled
                />
                <p className="m3-body-small text-on-surface-variant mt-1">
                  {t('user_settings.change_email_hint')}
                </p>
              </div>

              <Button
                type="submit"
                variant="filled"
                fullWidth
                loading={loading === 'profile'}
                icon={<Save size={20} />}
              >
                {loading === 'profile' ? t('user_settings.saving') : t('common.save')}
              </Button>
            </form>
          </Card>

          {/* Subscription Management - only show for active subscriptions (monthly) */}
          {/* Lifetime users don't need portal access as they have no recurring billing */}
          {user.subscriptionStatus === 'active' && (
            <Card variant="elevated" className="p-6">
              <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
                <CreditCard size={24} />
                {t('user.manage_subscription')}
              </h2>
              <p className="text-on-surface m3-body-medium mb-4">
                {t('user_settings.subscription_desc')}
              </p>
              <Button
                onClick={handleManageSubscription}
                variant="accent"
                fullWidth
                loading={loading === 'subscription'}
                icon={<CreditCard size={20} />}
              >
                {loading === 'subscription' ? t('user_settings.opening_portal') : t('user_settings.open_portal')}
              </Button>
            </Card>
          )}

          {/* Change Email */}
          <Card variant="elevated" className="p-6">
            <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
              <Mail size={24} />
              {t('user.change_email')}
            </h2>

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <TextField
                label={t('user_settings.new_email')}
                icon={<Mail size={20} />}
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('user_settings.new_email_placeholder')}
                required
              />

              <TextField
                label={t('auth.confirm_password')}
                icon={<Lock size={20} />}
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder={t('user_settings.current_password_placeholder')}
                required
              />

              <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-m3-md">
                <p className="m3-body-small font-semibold flex items-center gap-2">
                  <AlertCircle size={18} />
                  {t('user_settings.email_change_logout_hint')}
                </p>
              </div>

              <Button
                type="submit"
                variant="tonal"
                fullWidth
                loading={loading === 'email'}
                icon={<Mail size={20} />}
              >
                {loading === 'email' ? t('user_settings.updating') : t('user.change_email')}
              </Button>
            </form>
          </Card>

          {/* Danger Zone */}
          <Card variant="outlined" className="p-6 border-error">
            <h2 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
              <Trash2 size={24} className="text-error" />
              <span>{t('user.danger_zone')}</span>
            </h2>

            <p className="text-on-surface mb-4 m3-body-medium">
              <Trans
                i18nKey="user_settings.delete_explanation"
                components={{ strong: <strong className="text-on-error-container bg-error-container px-2 py-1 rounded-m3-sm" /> }}
              />
            </p>

            {!confirmDelete ? (
              <Button
                onClick={() => setConfirmDelete(true)}
                variant="outlined"
                fullWidth
                icon={<Trash2 size={20} />}
                className="text-error border-error"
              >
                {t('user.delete_account')}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-error-container text-on-error-container rounded-m3-md">
                  <p className="m3-body-small font-bold flex items-center gap-2">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    {t('user_settings.delete_warning')}
                  </p>
                </div>

                <TextField
                  icon={<Lock size={20} />}
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder={t('user_settings.password_to_confirm')}
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
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={loading === 'delete' || !deletePassword}
                    variant="danger"
                    className="flex-1"
                    loading={loading === 'delete'}
                    icon={<Trash2 size={20} />}
                  >
                    {loading === 'delete' ? t('user_settings.deleting') : t('user_settings.delete_permanently')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
        </PageShell>
  );
};

export default UserSettings;
