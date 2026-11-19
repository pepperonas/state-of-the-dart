import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import GoogleMark from './GoogleMark';
import { Button, Card, TextField } from '../common';
import { enterDrop, enterPop } from '../../utils/motion';
import BackToLanding from './BackToLanding';
import { Icon } from '../icons';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, googleAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <BackToLanding />
        {/* Logo/Header */}
        <motion.div {...enterDrop} className="text-center mb-8">
          <div className="mb-4 flex justify-center text-primary"><Icon name="target" size={56} /></div>
          <h1 className="m3-display-small m3-emphasized text-on-surface mb-2">
            {t('common.app_name')}
          </h1>
          <p className="m3-body-large text-on-surface-variant">{t('auth.login_subtitle')}</p>
        </motion.div>

        {/* Login Card */}
        <motion.div {...enterPop}>
          <Card variant="elevated" className="p-8">
            <h2 className="m3-headline-small m3-emphasized text-on-surface mb-6">{t('auth.login')}</h2>

            {error && (
              <div className="mb-4 p-4 bg-error-container text-on-error-container rounded-m3-md flex items-center gap-3 m3-error-in">
                <AlertCircle size={22} className="flex-shrink-0" />
                <span className="m3-body-medium font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <TextField
                type="email"
                label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                icon={<Mail size={20} />}
                required
              />

              <TextField
                type="password"
                label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock size={20} />}
                required
              />

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="m3-label-large transition-colors"
                  style={{ color: 'var(--m3-primary)' }}
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>

              <Button type="submit" variant="filled" size="lg" fullWidth loading={loading} icon={<LogIn size={20} />}>
                {loading ? t('common.loading') : t('auth.login_button')}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 m3-body-small bg-surface-container-low text-on-surface-variant">
                  {t('login.or')}
                </span>
              </div>
            </div>

            {/* Google Login */}
            <Button
              variant="outlined"
              size="lg"
              fullWidth
              onClick={googleAuth}
              icon={
                <GoogleMark />
              }
            >
              {t('auth.sign_in_google')}
            </Button>

            {/* Register Link */}
            <div className="mt-6 text-center m3-body-medium text-on-surface-variant">
              {t('auth.no_account')}{' '}
              <Link to="/register" className="font-semibold" style={{ color: 'var(--m3-primary)' }}>
                {t('auth.register')}
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
