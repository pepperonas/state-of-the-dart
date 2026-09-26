import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import api from '../../services/api';
import BackButton from '../common/BackButton';
import { Button, Card, TextField } from '../common';
import { enterDrop, enterPop } from '../../utils/motion';
import BackToLanding from './BackToLanding';
import { Icon } from '../icons';

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t('forgot_password.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <BackToLanding />
          <motion.div {...enterPop}>
            <Card variant="elevated" className="p-8 text-center">
              <div className="w-16 h-16 bg-success-container rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-on-success-container" size={32} />
              </div>
              <h2 className="m3-headline-small m3-emphasized text-on-surface mb-4">
                {t('forgot_password.sent_title')}
              </h2>
              <p className="m3-body-large text-on-surface-variant mb-6">
                <Trans
                  i18nKey="forgot_password.sent_body"
                  values={{ email }}
                  components={{ strong: <strong className="text-on-surface" /> }}
                />
              </p>
              <Link to="/login">
                <Button variant="filled" size="lg" fullWidth>
                  {t('register.to_login')}
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <BackToLanding />
        {/* Logo/Header */}
        <motion.div {...enterDrop} className="text-center mb-8">
          <div className="mb-4 flex justify-center text-primary"><Icon name="lock" size={56} /></div>
          <h1 className="m3-display-small m3-emphasized text-on-surface mb-2">
            {t('auth.forgot_password')}
          </h1>
          <p className="m3-body-large text-on-surface-variant">{t('forgot_password.subtitle')}</p>
        </motion.div>

        {/* Card */}
        <motion.div {...enterPop}>
          <Card variant="elevated" className="p-8">
            <BackButton onClick={() => navigate('/login')} label={t('forgot_password.back_to_login')} inline />

            <h2 className="m3-headline-small m3-emphasized text-on-surface mb-2">
              {t('auth.reset_password')}
            </h2>
            <p className="m3-body-medium text-on-surface-variant mb-6">
              {t('forgot_password.intro')}
            </p>

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

              <Button type="submit" variant="filled" size="lg" fullWidth loading={loading} icon={<Mail size={20} />}>
                {loading ? t('forgot_password.sending') : t('forgot_password.submit')}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
