import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Card, Button } from '../common';
import BackToLanding from './BackToLanding';
import LoadingIndicator from '../common/LoadingIndicator';

const VerifyEmail: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setError(t('verify_email.no_token'));
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    try {
      await api.auth.verifyEmail(token);
      setSuccess(true);
      // Auto-redirect after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || t('verify_email.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md m3-enter-pop">
          <BackToLanding />
          <Card variant="elevated" className="p-8 text-center">
            <LoadingIndicator size={48} />
            <h2 className="m3-headline-small text-on-surface mb-2">
              {t('verify_email.verifying')}
            </h2>
            <p className="m3-body-medium text-on-surface-variant">
              {t('verify_email.please_wait')}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md m3-enter-pop">
          <BackToLanding />
          <Card variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 bg-success-container rounded-m3-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success" size={32} />
            </div>
            <h2 className="m3-headline-small text-on-surface mb-4">
              {t('auth.email_verified')}
            </h2>
            <p className="m3-body-medium text-on-surface-variant mb-6">
              {t('verify_email.trial_started')}
            </p>
            <Button variant="success" fullWidth onClick={() => navigate('/login')}>
              {t('register.sign_in_now')}
            </Button>
            <p className="m3-body-small text-on-surface-variant mt-4">
              {t('verify_email.redirecting')}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md m3-enter-pop">
        <BackToLanding />
        <Card variant="elevated" className="p-8 text-center">
          <div className="w-16 h-16 bg-error-container rounded-m3-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-error" size={32} />
          </div>
          <h2 className="m3-headline-small text-on-surface mb-4">
            {t('verify_email.failed')}
          </h2>
          <p className="m3-body-medium text-on-surface-variant mb-6">
            {error || t('verify_email.invalid_link')}
          </p>
          <div className="space-y-3">
            <Button variant="filled" fullWidth onClick={() => navigate('/resend-verification')}>
              {t('reset_password.request_new')}
            </Button>
            <Button variant="text" fullWidth onClick={() => navigate('/login')}>
              {t('register.to_login')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
