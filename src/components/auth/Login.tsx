import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, TextField } from '../common';
import { enterDrop, enterPop } from '../../utils/motion';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
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
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <motion.div {...enterDrop} className="text-center mb-8">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="m3-display-small font-bold text-on-surface mb-2">
            {t('common.app_name')}
          </h1>
          <p className="m3-body-large text-on-surface-variant">{t('auth.login_subtitle')}</p>
        </motion.div>

        {/* Login Card */}
        <motion.div {...enterPop}>
          <Card variant="elevated" className="p-8">
            <h2 className="m3-headline-small font-bold text-on-surface mb-6">{t('auth.login')}</h2>

            {error && (
              <div className="mb-4 p-4 bg-error-container text-on-error-container rounded-m3-md flex items-center gap-3">
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
                  {i18n.language === 'de' ? 'Oder' : 'Or'}
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
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
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
