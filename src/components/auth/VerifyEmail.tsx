import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { Card, Button } from '../common';

const VerifyEmail: React.FC = () => {
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
      setError('Kein Verification-Token gefunden');
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
      setError(err.message || 'Verification fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <Card variant="elevated" className="p-8 text-center">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
            <h2 className="m3-headline-small text-on-surface mb-2">
              Verifiziere Email...
            </h2>
            <p className="m3-body-medium text-on-surface-variant">
              Bitte warte einen Moment
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <Card variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 bg-success-container rounded-m3-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success" size={32} />
            </div>
            <h2 className="m3-headline-small text-on-surface mb-4">
              Email erfolgreich verifiziert! 🎉
            </h2>
            <p className="m3-body-medium text-on-surface-variant mb-6">
              Dein 30-Tage-Trial hat begonnen! Du kannst dich jetzt anmelden und loslegen.
            </p>
            <Button variant="success" fullWidth onClick={() => navigate('/login')}>
              Jetzt anmelden
            </Button>
            <p className="m3-body-small text-on-surface-variant mt-4">
              Du wirst automatisch weitergeleitet...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="p-8 text-center">
          <div className="w-16 h-16 bg-error-container rounded-m3-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-error" size={32} />
          </div>
          <h2 className="m3-headline-small text-on-surface mb-4">
            Verification fehlgeschlagen
          </h2>
          <p className="m3-body-medium text-on-surface-variant mb-6">
            {error || 'Der Verification-Link ist ungültig oder abgelaufen.'}
          </p>
          <div className="space-y-3">
            <Button variant="filled" fullWidth onClick={() => navigate('/resend-verification')}>
              Neuen Link anfordern
            </Button>
            <Button variant="text" fullWidth onClick={() => navigate('/login')}>
              Zum Login
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
